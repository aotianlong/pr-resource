import _ from 'lodash';
import prettyBytes from 'pretty-bytes';
import { AttributesHook } from '../types';

const ProxyHandler = function ProxyHandler(
  gets: ((target: any, key: string, receiver?: any) => any)[],
  sets: ((
    target: any,
    key: string,
    value: any,
    receiver?: any
  ) => boolean)[] = []
): AttributesHook {
  const reservedKeys = ['toString'];
  return {
    has(target: any, key: string) {
      return Reflect.has(target, key) || Reflect.has(target._attributes, key);
    },
    getOwnPropertyDescriptor(target: any, k: string) {
      return Reflect.getOwnPropertyDescriptor(target._attributes, k);
    },
    ownKeys(target: any) {
      const targetKeys = Reflect.ownKeys(target);
      const attributesKeys = Reflect.ownKeys(target._attributes);
      const result = targetKeys.concat(attributesKeys);
      return result;
    },
    get(target: any, key: string, receiver?: any) {
      /*
      if (key === 'valueOf') {
        return () => {
          return target._attributes.id;
        };
      }
      */
      // console.log('get', key);
      // 保留的关键字直接传给target
      if (_.includes(reservedKeys, key)) {
        return Reflect.get(target, key, receiver);
      }
      // 处理module中指定的get
      try {
        let lastValue = null;
        const found = _.find(gets, (get) => {
          try {
            lastValue = get(target, key, receiver);
            return true;
          } catch (e: any) {
            return false;
          }
        });
        if (found) {
          // console.log('found module', key);
          return lastValue;
        }
      } catch (e: any) {
        console.log(e);
      }
      const { options } = target.klass;
      // 动态访问属性名BeforeTypeCast 可以获取原生的属性值
      if (_.isString(key)) {
        const result = /^(.+)BeforeTypeCast$/.exec(key);
        if (result) {
          const rawKey = result[1];
          return target._attributes[rawKey];
        }

        const humanSizeResult = /^(.+)HumanBytes$/.exec(key);
        if (humanSizeResult) {
          return prettyBytes(target._attributes[humanSizeResult[1]]);
        }

        const parseMarkdownResult = /^(.+)ParseMarkdown$/.exec(key);
        if (parseMarkdownResult) {
          return target.klass.parseMarkdown(
            target._attributes[parseMarkdownResult[1]]
          );
        }
      }

      // 从 _attributes 中读取
      if (
        target.klass.fields.includes(key) ||
        target.klass.columnNames.includes(key)
      ) {
        return target._attributes[key];
      }

      // 否则从resource中读取
      return Reflect.get(target, key, receiver);
    },
    set(target: any, key: string, value: any, receiver?: any): boolean {
      // 直接设置resource._attributes = {}
      if (key === '_attributes') {
        return Reflect.set(target, key, value, receiver);
      }

      // 各个module
      const found = _.find(
        sets,
        (set): boolean => set(target, key, value, receiver) as boolean
      );
      if (found) {
        return true;
      }

      // 是物件的属性, 则设置它
      if (
        _.includes(target.klass.fields, key) ||
        _.includes(target.klass.columnNames, key) // 感觉这个不需要
      ) {
        // return Reflect.set(target._attributes, key, value, receiver);
        target._attributes[key] = value;
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  };
};

export default ProxyHandler;
