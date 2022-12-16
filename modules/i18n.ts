import _ from 'lodash';
import inflection from 'inflection';
import { ModuleDefinition, ResourceClass } from '../types';
import { toResourceClass } from '../lib/utils';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    classMethods: {
      t(key: string, ...args: any[]): string {
        return this.$i18n.global.t(key, ...args);
      },
      humanAttrName(name: string) {
        return this.attrName(name);
      },
      /**
       * 返回经过i18n翻译后的名称
       * 也可以解析比如 users.0.username
       * 会被解析成 1.用户用户名
       * @param name
       * @returns string
       */
      attrName(name: string) {
        if (!name) return '';
        const match = name.match(/^(\w+)\.(\d+)\.(\w+)$/);
        if (match) {
          const [, module, index, field] = match;
          const className = inflection.classify(module);
          const Klass = toResourceClass(className);
          const parsedIndex = parseInt(index, 10) + 1;
          if (Klass) {
            return `${parsedIndex}.${Klass.humanName}${Klass.attrName(field)}`;
          }
        }
        const key = `activerecord.attributes.${this.className}.${name}`;
        const fallbackKey = `attributes.${name}`;
        let result = null;
        try {
          if (this.$i18n.global.te(key)) {
            result = this.t(key);
          }
          if (!result) {
            if (this.$i18n.global.te(fallbackKey)) {
              result = this.t(fallbackKey);
            }
          }
        } catch (e) {
          try {
            if (this.$i18n.global.te(fallbackKey)) {
              result = this.t(fallbackKey);
            }
          } catch (ee) {
            console.log('e');
          }
        }
        if (!result) {
          result = name;
        }
        return result;
      },
    },
    mounted(klass: ResourceClass) {
      const i18n = () => {
        const i18nData = klass.$i18n.global.tm(
          `activerecord.attributes.${klass.className}`
        );
        return _.defaults(klass.options.i18n || {}, i18nData);
      };
      const humanName = () => {
        const key = `activerecord.models.${klass.className}`;
        console.log(key);
        return klass.options.humanName || klass.t(key) || klass.name;
      };
      Object.defineProperty(klass, 'humanName', {
        get: humanName,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(klass, 'i18n', {
        get: i18n,
        enumerable: true,
        configurable: true,
      });
    },
  };
  return mod;
};

export default useModule;
