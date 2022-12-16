import gql from 'graphql-tag';
import _ from 'lodash';
import { Base64 } from 'js-base64';
import {
  ID,
  ModuleDefinition,
  AnyObject,
  ResourceClass,
  BuildGqlOptions,
} from '../types';
import Field from '../lib/schema/field';
import { parseColumns } from '../lib/parse-columns';
/*
gql`
query findNode(id: $id) {
  id
  ${field} (page: 1) {
  }
}
`
*/

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    classMethods: {
      parseVariableNames(variableNames: AnyObject) {
        return Field.parseVariableNames(variableNames);
      },
      gql(str: string) {
        return gql`
          ${str}
        `;
      },
      ensureGql(this: ResourceClass, str: string) {
        if (typeof str === 'string') {
          return this.gql(str);
        }
        return str;
      },
      query(this: ResourceClass, str: string, variables = {}, options = {}) {
        const query = this.ensureGql(str);
        return this.$apollo.query({
          query,
          variables,
          ...options,
        });
      },
      mutate(this: ResourceClass, str: string, variables = {}, options = {}) {
        const mutation = this.ensureGql(str);
        return this.$apollo.mutate({
          mutation,
          variables,
          ...options,
        });
      },

      destroy(
        this: ResourceClass,
        id: string,
        options: { isSoft?: boolean } = {}
      ) {
        const actionName = `deleteNode`;
        const { isSoft } = options;
        const gqlStr = `
        mutation($id: NodeId!, $isSoft: Boolean){
          ${actionName}(id: $id, isSoft: $isSoft){
            errors
          }
        }
      `;
        this.log(gqlStr);
        const query = gql`
          ${gqlStr}
        `;
        const result = this.$apollo.mutate({
          mutation: query,
          variables: {
            id,
            isSoft,
          },
        });
        return new Promise((resolve, reject) => {
          result.then((response) => {
            const data = response.data[actionName];
            if (data.errors.length) {
              reject(data.errors);
            } else {
              resolve(data);
            }
          });
        });
      },
      // 批量删除
      /*
      User.destroyAll(1,2,3, {opt: nul;});
      */
      destroyAll(this: ResourceClass, ...ids: (ID | object)[]) {
        let options = {};
        if (_.isObject(_.last(ids))) {
          options = ids.pop() as object;
        }
        ids = _.flatten(ids);
        const results: Promise<any>[] = [];
        _.each(ids, (id) => {
          const result = this.destroy(id as string, options);
          results.push(result);
        });
        return Promise.all(results);
      },
      // 批量更新
      // objects:
      //  {
      //    1: {title: 'new title'},
      //    2: {title: 'new title2'}
      //  }
      // 或者
      // [
      //   {id: 1, title: 'new title'},
      //   {id: 2, title: 'new title2'}
      // ]
      updateAll(
        this: ResourceClass,
        objects: { [key: string]: any }[],
        saveOptions: AnyObject = {}
      ) {
        // 转换成数组
        const objs: AnyObject[] = [];
        if (_.isPlainObject(objects)) {
          _.each(objects, (k, v) => {
            const object = Object.assign(v, {
              id: k,
            });
            objs.push(object);
          });
        }
        const results = [];
        _.each(objs, (obj) => {
          const result = new this(obj).save(saveOptions);
          results.push(result);
        });
        return Promise.all(results);
      },
      /*
      // alias
      batchUpdate(this: ResourceClass, objects) {
        return this.updateAll(objects);
      },
      */
      buildColumns(
        this: ResourceClass,
        columns: string | null | (() => string) = null
      ) {
        if (columns) {
          return parseColumns(columns, this.fragments);
        }
        return this.fragments.default;
      },
      /**
       * 根据variables返回一个解析好的{apply, define}数组， 如果某个变量的类型没有定义，会抛出出错误
       */
      buildVariableNamesByVariables(variables: AnyObject) {
        return this.queryField.queryVariableObject(variables);
      },
      buildGql(options: BuildGqlOptions = {}) {
        options = {
          gql: false,
          ...options,
        };
        let { name, columns } = options;
        const { queryName } = options;
        let findName = null;
        name = queryName || this.objectsName;
        findName = `find${this.classesName}`;
        columns = this.buildColumns(columns as string);

        const { alias } = options;
        if (alias) {
          name = `${alias}:${name}`;
        }
        let gqlStr = '';
        let variableNames = {};
        if (options.variables) {
          if (this.variableNames.first) {
            // 如果没有设置，则默认为30
            if (!options.variables.first) {
              options.variables.first = 30;
            }
          }
          if (this.variableNames.after) {
            if (!options.variables.after) {
              options.variables.after = Base64.encode('0');
            }
          }
          variableNames = this.buildVariableNamesByVariables(options.variables);
        } else {
          // variableNames = this.buildVariableNames(this.variableNames);
          variableNames = this.buildVariableNames({});
        }
        let { define, apply } = variableNames as {
          define: string;
          apply: string;
        };
        if (define) {
          define = `(${define})`;
        }
        if (apply) {
          apply = `(${apply})`;
        }

        columns = `
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          ${columns}
        }
        `;

        gqlStr = `
          query ${findName}${define} {
          ${name}${apply} {
              ${columns}
            }
          }
        `;

        if (options.gql) {
          return gql`
            ${gqlStr}
          `;
        }
        return gqlStr;
      },
      buildQuery(
        this: ResourceClass,
        options: BuildGqlOptions = {},
        apolloOptions = {}
      ) {
        apolloOptions = { fetchPolicy: 'network-only' };
        if (!options.variables) {
          options.variables = {};
        }
        options.gql = true;
        const { variables } = options;
        const query = this.buildGql(options);
        // query = gql`${query}`
        const result = {
          query,
          variables,
          resource: this,
          ...apolloOptions,
        };
        return result;
      },
    },
  };
  return mod;
};

export default useModule;
