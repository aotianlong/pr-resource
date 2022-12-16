import _ from 'lodash';
import * as moment from 'moment';
import { reactive } from 'vue';
import { AnyObject, ModuleDefinition, Resource } from '../types';
import { getAttributes } from '../lib/parse-columns';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    computed: {
      // 获取 _attributes
      // 跟直接获取_attribues不同的是，它返回的是一个新的对象，并且有afterAttributes回调
      // 并且使用的是经过属性处理过后的数据
      attributes() {
        const value: AnyObject = {};
        const keys = _.keys(this._attributes);
        keys.forEach((key) => {
          value[key] = this.$proxy[key];
        });
        this.klass.runHooks('afterAttributes', { attrs: value, object: this });
        return value;
      },
      // 返回一个克隆的属性对象
      cloneAttributes() {
        return _.cloneDeep(this._attributes);
      },
    },
    methods: {
      set(name: string, value: any) {
        _.set(this._attributes, name, value);
        return value;
      },
      get(name: string, defaultValue: any = null) {
        return _.get(this._attributes, name) || defaultValue;
      },
      // 获取图片的种类url
      getVariant(name: string, variant: string): string | null {
        const value = this[name];
        if (value) {
          return [value, variant].join('-').replace('?', '');
        }
        return null;
      },
      markDestroyed() {
        this._attributes._destroy = true;
      },
      merge(resource: Resource | AnyObject, reverse = false) {
        let attributes: AnyObject = resource;
        if (resource._isResource) {
          attributes = <Resource>resource._attributes;
        }
        Object.keys(attributes).forEach((key) => {
          this.set(key, attributes[key]);
        });
        return this;
      },
      getAttributes() {
        let value = null;
        if (this.klass.fields) {
          value = this.klass.getAttributes(
            this.klass.formatAttributes(
              // Object.assign({}, this._attributes)
              { ...this.attributes }
            )
          );
        } else {
          value = this._attributes;
        }
        // console.log('beforeGetAttributes', value)
        this.klass.runHooks('afterGetAttributes', {
          attrs: value,
          object: this,
        });
        return value;
      },
      attr(...args: [string, any?]): any {
        if (args.length === 1) {
          return this._attributes[args[0]];
        }
        if (args.length === 2) {
          const [k, v] = args;
          this._attributes[k] = v;
          return v;
        }
        return this;
      },
    },
    classMethods: {
      formatAttributes(attrs = {}) {
        return attrs;
      },
      getAttributes(attrs: AnyObject = {}, type = null): AnyObject {
        return getAttributes(attrs, this.inputType);
      },
    },
  };
  return mod;
};

export default useModule;
