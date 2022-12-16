/*
// fragments
createResource({
  fragments: {
    id: `
      id
    `,
    extra: `
      extra1
      extra2
    `,
    default: `
      id
      username
      nickname
      user {
        ${User.fragments.base}
      }
    `,
  }
})

默认传递的columns参数会作为fragments.default

User.find({
  columns: `
  + id
  += id
  += extra2
  `,
})
*/

import _ from 'lodash';
import type { ModuleDefinition, ResourceClass, Fragment } from '../types';
import Type from '../lib/schema/type';
import { formatColumns } from '../lib/parse-columns';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    classAttributes: {
      fragments: {},
      defaultFraments: {},
    },
    classMethods: {
      /*
       */
      getColumnsByFragment(
        this: ResourceClass,
        fragmentName: string | string[],
        baseColumns = ''
      ) {
        if (_.isArray(fragmentName)) {
          let result = '';
          _.each(fragmentName, (f) => {
            result = this.getColumnsByFragment(f, result);
          });
          return result;
        }
        // 处理 fragment 选项
        let columns = '';
        if (fragmentName) {
          const fragment = this.fragments[fragmentName];
          if (fragment) {
            // columns = this.buildColumns(fragment, baseColumns)
            if (_.isFunction(fragment)) {
              columns = baseColumns + fragment();
            } else {
              if (_.isPlainObject(fragment)) {
                return formatColumns(fragment);
              }
              columns = baseColumns + fragment;
            }
          } else {
            throw new Error(`fragment: ${fragmentName} not defined`);
          }
        }
        return columns;
      },
    },
    mounted(klass) {
      Object.defineProperty(klass, 'fragments', {
        get() {
          const newFragments: Record<string, Fragment> = _.cloneDeep(
            klass.options.fragments || {}
          );
          Object.keys(newFragments).forEach((key) => {
            if (_.isFunction(newFragments[key])) {
              newFragments[key] = newFragments[key](klass);
            }
          });
          const fragments = _.defaults(
            newFragments,
            klass.defaultFragments || {},
            klass.type.toFragments()
          );
          // 设置一个默认的fragment, 默认是columns选项
          if (!fragments.default && klass.columns) {
            fragments.default = klass.columns;
          }
          return fragments;
        },
      });
    },
  };
  return mod;
};

export default useModule;
