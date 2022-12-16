import _ from 'lodash';
import moment from 'moment';
import { ModuleDefinition, ResourceClass } from '../types';
import ActiveStorageUrl from '../lib/active-storage-url';
import { formatColumns, parseColumns } from '../lib/parse-columns';
import { Connection } from './connection';
import { isResource } from '../lib/utils';
import Field from '../lib/schema/field';

function convertFieldValue(target: any, value: any, field: Field): any {
  /*
  if (_.isArray(value)) {
    return value.map((v) => convertFieldValue(target, v, field));
  }
  */

  const { resourceClass } = field;
  const key = field.name;

  if (field.isConnection) {
    console.log('from resource', key);
    const connection = Connection.fromResource(target, key);
    return connection;
  }

  if (!value) {
    // 如果是false值， 则直接返回，不需要处理。
    return value;
  }

  if (resourceClass) {
    if (target._resources[key] === null) {
      return null;
    }
    // eslint-disable-next-line new-cap
    if (target._resources[key]) {
      return target._resources[key];
    }
    let resource: any;
    if (_.isArray(value)) {
      // eslint-disable-next-line new-cap
      resource = value.map((v) => new resourceClass(v));
    } else {
      // eslint-disable-next-line new-cap
      resource = new resourceClass(value);
    }
    target._resources[key] = resource;
    return resource;
  }

  // console.log('field', field.type, field.type.name);
  switch (field.type?.name) {
    case 'ActiveStorageUrl':
      return value;
    // return ActiveStorageUrl.from(value);
    case 'Time':
    case 'Date':
    case 'DateTime':
      return moment(value);
    default:
      throw new Error('not match');
  }
}

/*
通过graphql的自省，来获取相关信息
*/
const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    initialize() {
      this._resources = {};
    },
    get(target: any, key: string, receiver?: any): any {
      const { klass } = target;
      const { type } = klass;
      const field = type.getField(key);
      if (!field) {
        throw new Error('not match');
      }
      const value = target._attributes[key];
      return convertFieldValue(target, value, field);
    },
    set(target: any, key: string, value: any, receiver?: any): boolean {
      if (_.isDate(value) && key.match(/(On|In|At)$/)) {
        const newValue = (value as Date).toISOString();
        target._attributes[key] = newValue;
        return true;
      }
      // todo: 或许需要判断key是不是一个resource，更精确点
      if (target._resources?.[key] !== undefined) {
        target._resources[key] = value;
        return true;
      }
      return false;
    },
    mounted(klass: ResourceClass) {
      Object.defineProperty(klass, 'queryArguments', {
        get() {
          return klass.queryField?.argumentsHash;
        },
        enumerable: true,
      });

      Object.defineProperty(klass, 'queryField', {
        get() {
          return klass.$schema.getQuery(klass.objectsName);
        },
        enumerable: true,
      });

      Object.defineProperty(klass, 'type', {
        get() {
          return klass.$schema.getType(klass.name);
        },
        enumerable: true,
      });

      Object.defineProperty(klass, 'inputType', {
        get() {
          return klass.$schema.getType(`${klass.name}Attributes`);
        },
        enumerable: true,
      });

      // 重新定义 columns
      Object.defineProperty(klass, 'columns', {
        get() {
          if (klass.options.columns) {
            return formatColumns(klass.options.columns);
          }
          return klass.type.toQueryString();
        },
        enumerable: true,
      });

      Object.defineProperty(klass, 'scalarColumns', {
        get() {
          return _.map(klass.type.scalarFields, (f) => f.name);
        },
        enumerable: true,
      });

      Object.defineProperty(klass, 'fieldNames', {
        get() {
          return klass.inputType.inputFieldNames;
        },
        enumerable: true,
      });

      Object.defineProperty(klass, 'columnNames', {
        get() {
          return klass.type.fieldNames;
        },
        enumerable: true,
      });

      Object.defineProperty(klass, 'columnsHash', {
        get() {
          return klass.type.fieldsHash;
        },
        enumerable: true,
      });
    },
    classMethods: {
      columnsByDepth(depth = 1) {
        return this.type.toQueryString({ maxDepth: depth });
      },
    },
  };
  return mod;
};

export default useModule;
