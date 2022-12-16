import _ from 'lodash';
import inflection from 'inflection';
import { inferFormFieldType } from '../lib/inference';
import { ModuleDefinition, Resource, ResourceClass } from '../types';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    classMethods: {
      fieldType(name: string) {
        return (
          this.options.fieldTypes?.[name] ||
          inferFormFieldType(name, this.type.getField(name)?.name)
        );
      },
      fieldTypes() {
        const types: Record<string, string> = {};
        this.fields.forEach((field) => {
          types[field as string] = this.fieldType(field);
        });
        return types;
      },
    },
    mounted(klass: ResourceClass) {
      Object.defineProperty(klass, 'fieldsHash', {
        get() {
          return klass.inputType.inputFieldsHash;
        },
      });
      /**
       * 处理fields
       * 目前的处理方式是:
       * 如果在options中定义了fields，则使用options中的fields
       * 这样的话，应该可以简化fields定义
       */
      Object.defineProperty(klass, 'fields', {
        get() {
          if (klass._fields) {
            return klass._fields;
          }
          let result: any[] = [];
          const { fields } = klass.options;
          const schemaFields = klass.inputType?.inputFieldNames || [];
          if (fields) {
            if (_.isFunction(fields)) {
              result = fields(schemaFields);
            } else {
              result = fields as any[];
            }
          } else {
            result = schemaFields;
          }
          return result;
        },
      });
    },
  };
  return mod;
};

export default useModule;
