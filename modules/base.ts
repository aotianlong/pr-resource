import { FetchResult } from 'apollo-link';
import gql from 'graphql-tag';
import _ from 'lodash';
import { reactive } from 'vue';
import { Base64 } from 'js-base64';
import { base64json, formatErrors } from '../lib/utils';

import {
  AnyObject,
  ModuleDefinition,
  Resource,
  ResourceClass,
  SaveOption,
} from '../types';
import { parse } from '../lib/node-id';

const methods = {};

const useModule = function useModule(): ModuleDefinition {
  const mod: ModuleDefinition = {
    methods: {
      // override this method to provide a parent id
      getParentId() {
        const { parentId } = this.klass.options;
        return parentId?.(this);
      },
      /**
       * 对比两个resource是否相等
       * 如果两个资源的id相等， 我们就认为这两个资源是相等的
       */
      isEquals(resource: Resource) {
        return this.id === resource.id;
      },
      /**
       * 重置属性
       */
      reset() {
        Object.keys(this._attributes).forEach((key) => {
          this._attributes[key] = undefined;
        });
        this.klass.options.initialize?.bind(this)();
        return this;
      },

      /**
       * @returns 克隆一个 resource
       */
      clone() {
        const Klass = this.klass;
        return new Klass(_.cloneDeep(this._attributes));
      },

      /**
       * @returns Resource的json表述
       */
      toJSON() {
        // return JSON.stringify(this._attributes)
        return { _isResource: true, ...this._attributes };
      },

      toBase64() {
        return base64json.stringify(this._attributes);
      },

      assign(attrs) {
        _.each(attrs, (v, k) => {
          this[k] = v;
        });
        return this;
      },

      reload(options = {}) {
        const obj = this.fetch(options);
        this._attributes = obj._attributes;
        return this;
      },

      /**
       * 根据当前的id，重新从服务器上获取
       */
      fetch(options = {}) {
        return this.klass.find(this.id, options);
      },

      /**
       * 是否是一个新记录
       * @returns {Boolean}
       */
      isNewRecord() {
        return !this._attributes.id;
      },
      /**
       * 此回调会在调用destroy之前被调用
       */
      beforeDestroy() {},
      /**
       * 从服务器上销毁一个对象
       * @param options
       * @returns
       */
      destroy(options = {}) {
        this.beforeDestroy();
        this._deleting = true;
        const { id } = this._attributes;
        if (id) {
          return this.klass
            .destroy(id as string, options)
            .then((r) => {
              this._destroy = true;
              return r;
            })
            .finally(() => {
              this._deleting = false;
            });
        }
        return Promise.reject(new Error('id not found'));
      },
      /**
       * 如果此函数返回false, 会阻止update继续运行
       * @param options
       * @returns boolean
       */
      beforeUpdate(options?: object) {
        return true;
      },
      /**
       * 此函数会在更新成功之后被调用
       * @param options
       * @returns
       */
      afterUpdate(options?: object) {
        return true;
      },
      /**
       * 批量更新属性
       * @param attrs
       */
      updateAttributes(attrs: AnyObject = {}) {
        Object.keys(attrs).forEach((k) => {
          this.set(k, attrs[k]);
        });
      },
      update(options: { validate?: boolean } = {validate: true}) {
        this._updating = true;
        this._submitting = true;
        this.beforeUpdate(options);
        if (options.validate && !this.isValid()) {
          Promise.reject(this.errors);
        }

        const attributes = this.getAttributes();
        console.log('update attributes', attributes);
        const r = this.klass.update(this.id, attributes, options);
        // 尽可能的还原现有属性
        r.then((resource) => {
          resource.merge(this._attributes);
          return resource;
        })
        .catch((e) => {
          if (e.graphQLErrors) {
            const err = { key: 'base', value: e.message };
            this.setErrors(err);
          } else {
            this.setErrors(e);
          }
        })
        .finally(() => {
          this._updating = false;
          this._submitting = false;
        });
        return r;
      },
      /**
       * 保存资源， 如果是新记录，会创建一条新记录
       * 如果是已经存在的资源， 则会更新此资源
       * @param options
       * @returns
       */
      save(options = {}) {
        options = { validte: true, ...options };
        if (this.isNewRecord()) {
          return this.create(options);
        }
        return this.update(options);
      },
      beforeCreate(_options: object = {}) {
        return true;
      },
      afterCreate(_options: object = {}) {
        return true;
      },
      /**
       * 创建资源，创建过程中会设置状态 _creating
       */
      create(options: SaveOption = {validate: true}) {
        this._creating = true;
        this._submitting = true;
        this.beforeCreate(options);
        if (options.validate && !this.isValid()) {
          return Promise.reject(this.errors);
        }
        const { fieldName } = this.klass;
        const columns = this.klass.buildColumns(
          options.columns as string,
          '',
          options.fragments
        ); // || this.klass.columns()
        const extraColumns = options.extraColumns || '';
        const actionName = `create${this.klass.className}`;

        const variableNames = {
          attributes: `${this.klass.className}Attributes!`,
          ...(options.variableNames || {}),
        };
        const parsedVariableNames =
          this.klass.parseVariableNames(variableNames);

        const gqlStr = `mutation(${parsedVariableNames.define}) {
            ${actionName}(${parsedVariableNames.apply}) {
              errors
              ${fieldName} {
                ${columns}
              }
              ${extraColumns}
            }
          }`;

        const attrs = this.getAttributes();
        // 去掉id
        delete attrs.id;

        const variables = {
          attributes: attrs,
          ...(options.variables || {}),
        };
        this.klass.log(gqlStr, variables);
        const query = gql`
          ${gqlStr}
        `;
        const result = this.klass.$apollo.mutate({
          mutation: query,
          variables,
        });
        return new Promise((resolve, reject) => {
          result
            .then((response) => {
              const data = response.data[actionName];
              const object = data[fieldName];
              const formattedErrors = formatErrors(data.errors);
              if (formattedErrors) {
                reject(formattedErrors);
              } else {
                if (options.raw) {
                  resolve(data);
                } else {
                  // 设置自身的id
                  this.set('id', object.id);
                  const Klass = this.klass;
                  resolve(new Klass(object));
                }
                this.afterCreate(options);
              }
            })
            .catch((e) => {
              if (e.graphQLErrors) {
                const err = { key: 'base', value: e.message };
                this.setErrors(err);
                reject(err); //eslint-disable-line
                // reject(e.message);
              } else {
                this.setErrors(e);
                reject(e);
              }
            })
            .finally(() => {
              this._creating = false;
              this._submitting = false;
            });
        });
      },
    },
    classMethods: {
      fromBase64(str: string) {
        const Klass = this;
        return new Klass(base64json.parse(str) as AnyObject);
      },
      use(plugin: { install: (resourceClass: ResourceClass) => void }) {
        plugin.install(this);
      },
      create(attributes: AnyObject = {}, options: SaveOption = {}) {
        const resource = new this(attributes);
        return resource.save(options);
      },
      update(
        this: ResourceClass,
        id: string,
        attrs: AnyObject = {},
        options: SaveOption = {}
      ) {
        const { fieldName } = this;
        const columns = this.buildColumns(
          options.columns,
          '',
          options.fragments
        ); // || this.klass.columns()
        const actionName = `update${this.className}`;
        const extraColumns = options.extraColumns || '';

        const variableNames = {
          id: 'NodeId!',
          attributes: `${this.className}Attributes!`,
          ...(options.variableNames || {}),
        };
        const parsedVariableNames = this.parseVariableNames(variableNames);

        const gqlStr = `
        mutation(${parsedVariableNames.define}) {
          ${actionName}(${parsedVariableNames.apply}) {
            errors
            ${fieldName} {
              ${columns}
            }
            ${extraColumns}
          }
        }
      `;
        const query = gql`
          ${gqlStr}
        `;
        const attributes = attrs;
        delete attributes.id;
        const variables = {
          id,
          attributes,
          ...(options.variables || {}),
        };
        const result = this.$apollo.mutate({
          mutation: query,
          variables,
        });
        const { objectsName } = this;
        return result
          .then((response: FetchResult<any>) => {
            const data = response.data[actionName];
            const formattedErrors = formatErrors(data.errors);
            if (formattedErrors) {
              // this.setErrors(formattedErrors);
              return Promise.reject(formattedErrors);
            }
            if (options.raw) {
              return response;
            }
            const r = new this(data[fieldName]);
            return r;
          })
          .catch((e: any) => {
            if (e.graphQLErrors) {
            return Promise.reject({ key: 'base', value: e.message });// eslint-disable-line
            }
            return Promise.reject(e);
          });
      },
      createNodeId(id: string, type: string | null = null) {
        return Base64.encode([type || this.name, id].join('/'));
      },
      parseNodeId: parse,
      isValidNodeId(id: string): boolean {
        return !!this.parseNodeId(id);
      },
      ensureNodeId(id: string | string[]): string | string[] {
        if (_.isArray(id)) {
          return id.map((i) => this.ensureNodeId(i));
        }
        if (this.isValidNodeId(id)) {
          return id;
        }
        return this.createNodeId(id);
      },
    },
    computed: {
      _isResource() {
        return true;
      },
      _nodeType() {
        return this._node?.split('/')?.[0];
      },
      _nodeId() {
        return this._node?.split('/')?.[1];
      },
      _node() {
        try {
          return atob(this.id);
        } catch (e) {
          return '';
        }
      },
    },
  };
  return mod;
};

export default useModule;
