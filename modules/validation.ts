/*
export default createResource({
  name: 'User',
  validate () {
    if(!this.username) {
      this.errors.username = '不可以为空'
    }
  }
})
*/
import _ from 'lodash';
import { Schema } from 'b-validate';
import { reactive } from 'vue';
import {
  FormStatus,
  ModuleDefinition,
  ResourceClass,
  AnyObject,
} from '../types';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    initialize() {
      this.errors = reactive({});
      this.validated = false;
    },
    classAttributes: {
      validationSchema: null,
    },
    mounted(this: ResourceClass) {
      let validationRules = this.options.validationRules || {};
      // format validation rules
      const defaults = {
        type: 'string',
      };
      validationRules = _.mapValues(validationRules, (rule, field) => {
        if (!_.isArray(rule)) {
          rule = [rule];
        }
        const formattedRules = _.map(rule as any[], (item) => {
          if (!_.isPlainObject(item)) {
            throw Error('validationRules must be an object');
          }
          item = _.defaults(item, defaults);
          if (!item.message) {
            let message = '';
            const name = this.i18n[field] || field;
            // 自动设置默认的message
            if (item.required) {
              message = `不可以为空`;
            }
            if (item.type === 'ip') {
              message = 'IP地址不正确';
            }
            if (item.type === 'email') {
              message = '邮箱地址不正确';
            }
            if (item.type === 'url') {
              message = 'URL地址不正确';
            }
            if (item.maxLength) {
              message = `超过最爱大长度${item.maxLength}`;
            }
            item.message = message;
          }
          // 如果有validator自定义的验证方法，则使用自定义的验证方法
          /*
          if (item.validator) {
            item.validator.bind(this);
          }
          */
          return item;
        });
        return formattedRules;
      });
      const validationSchema = new Schema(validationRules);
      this.validationSchema = validationSchema;
    },
    computed: {
      validationSchema() {
        return this.klass.validationSchema;
      },
    },
    classMethods: {
      computeStates(errors: AnyObject) {
        const r: AnyObject = {};
        _.each(this.fields, (field) => {
          if (_.isString(field)) {
            r[field] = 'success';
          }
        });
        _.each(errors, (v, k) => {
          r[k] = 'error';
        });
        // console.log('compute states', r)
        return r;
      },
    },
    methods: {
      validateAssociations(name: string) {
        const objects = this[name];
        if (objects) {
          _.each(objects, (object, index) => {
            // 标记为删除的物件无需验证
            if (object._destroy) {
              return;
            }
            object.isValid();
            // console.log(sku.computeFormStatus(index));
            _.each(object.errors, (v, k) => {
              const newK = object.keyByIndex(index, k);
              this.errors[newK] = v;
            });
          });
        } else {
          console.log('association not found', name);
        }
      },
      hasErrors() {
        return _.keys(this.errors).length > 0;
      },
      clearErrors() {
        Object.keys(this.errors).forEach((key) => {
          delete this.errors[key];
        });
      },
      setErrors(errors: Record<string, string>) {
        this.clearErrors();
        Object.keys(errors).forEach((key) => {
          this.errors[key] = errors[key];
        });
      },
      keyByIndex(index: number, key?: string) {
        let name = `${this.klass.objectsName}.${index}`;
        if (key) {
          name = `${name}.${key}`;
        }
        return name;
      },
      computeFormStatus(index?: number) {
        const states = this.computeStates();
        const result: FormStatus = {};
        _.each(states, (v, k) => {
          if (index !== undefined) {
            k = this.keyByIndex(index, k);
          }

          result[k] = { status: v as string, message: '' };
          if (v === 'error') {
            result[k].message = this.errors[k];
          }
        });
        return result;
      },
      computeStates() {
        const r = this.klass.computeStates(this.errors);
        this.klass.runHooks('afterComputeStates', { object: this, states: r });
        return r;
      },
      validatesAssociation(association: string) {
        const associationObject = this[association];
        if (_.isArray(associationObject)) {
          // todo validate associations
        } else if (associationObject && associationObject._isResource) {
          associationObject.isValid();
          const associationErrors = associationObject.errors;
          if (associationErrors) {
            _.each(associationErrors, (v, k) => {
              this.errors[`${association}.${k}`] = v;
            });
          }
        }
      },
      validatesPresenceOf(...args: string[]) {
        _.each(args, (arg) => {
          if (_.isEmpty(this[arg])) {
            this.errors[arg] = '不可以为空';
          }
        });
      },
      validatesInclusionOf(name: string, values = []) {
        if (!_.includes(values, this[name])) {
          this.errors[name] = `不在范围(${values.join(', ')})之内`;
        }
      },
      validatesFormatOf(arg: string, format: RegExp) {
        if (!_.isRegExp(format)) {
          throw Error(`${format} is not a regexp`);
        }
        if (!this[arg].test(format)) {
          this.errors[arg] = '格式不正确';
        }
      },
      validate(options = {}) {
        const validate = _.get(this, 'klass.options.validate');
        if (validate) {
          validate.bind(this.$proxy)();
        } else {
          console.log('method not implement.');
        }
        // 使用validationSchema来验证
        const { validationSchema } = this;
        validationSchema.validate(this.getAttributes(), (errors) => {
          if (errors) {
            _.each(errors, (error, key) => {
              this.errors[key] = error.message;
            });
          }
        });
        // 结束验证
        this.klass.runHooks('afterValidate', { object: this, options });
      },
      isValid(options = {}) {
        this.clearErrors();
        this.validated = false;
        if (this._destroy) {
          // 如果自身标记为待删除，则无需在客户端验证
          console.log('object marked destroy, skip validation');
        } else {
          this.validate(options);
        }
        this.validated = true;
        if (_.keys(this.errors).length) {
          console.log('attributes', this._attributes, this, this.errors);
          return false;
        }
        return true;
      },
    },
  };
  return mod;
};

export default useModule;
