import {
  defineStore,
  DefineStoreOptions,
  StateTree,
  Store,
  _ActionsTree,
  _GettersTree,
  _StoreWithActions,
} from 'pinia';
import _ from 'lodash';
import {
  DefaultStoreState,
  ID,
  ModuleDefinition,
  Resource,
  ResourceClass,
  AnyObject,
} from '../types';

type StoreMapOption = {
  from: string;
  to: string;
  _mapOptionParsed: boolean;
};

type parsedOpt = StoreMapOption;

function parseMapOption(option: any): parsedOpt[] {
  if (_.isString(option)) {
    return [{ from: option, to: option, _mapOptionParsed: true }];
  }
  if (_.isPlainObject(option)) {
    if (option._mapOptionParsed) {
      return [option];
    }
    const result = _.keys(option).map((key) => {
      const value = option[key];
      return {
        from: key,
        to: value,
        _mapOptionParsed: true,
      };
    });
    return result;
  }
  if (_.isArray(option)) {
    return _.flatten(
      option.map((opt) => {
        return parseMapOption(opt);
      })
    );
  }
  throw Error('unknow args type');
}

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    classAttributes: {
      useStore: null,
    },
    mounted(klass) {
      const { store } = klass.options;
      if (store) {
        const storeDef: DefineStoreOptions<
          string,
          StateTree,
          _GettersTree<StateTree>,
          _ActionsTree
        > = store(klass);
        klass.useStore = klass.toStore(storeDef);
      } else {
        klass.useStore = klass.toStore();
      }
    },
    classMethods: {
      // 这个是用来放在computed里面的语法糖
      // 不用自己写get, set了
      mapAccessor(opts: any = null): AnyObject {
        if (opts) {
          const _this = this;
          const hash: AnyObject = {};
          _.each(parseMapOption(opts), (opt) => {
            const value = {
              get() {
                const store = _this.useStore();
                return store[opt.from];
              },
              set(v: any) {
                const store = _this.useStore();
                store[opt.from] = v;
              },
            };
            hash[opt.to] = value;
          });
          return hash;
        }
        return {};
      },
      mapState(name: ResourceClass, opts: any = null) {
        if (opts) {
          const _this = this;
          const hash: AnyObject = {};
          _.each(parseMapOption(opts), (opt) => {
            const value = {
              get() {
                const store = _this.useStore();
                return store[opt.from];
              },
            };
            hash[opt.to] = value;
          });
          return hash;
        }
        return {};
      },
      toStore(
        this: ResourceClass,
        storeConfig: DefineStoreOptions<
          string,
          StateTree,
          _GettersTree<StateTree>,
          _ActionsTree
        >
      ) {
        const { classesName, objectName, objectsName } = this;
        const _this = this;
        const originalStoreConfig = {
          id: this.objectName,
          state(): DefaultStoreState {
            return <DefaultStoreState>{
              class: _this,
              object: null,
              [_this.objectName]: null,
              [_this.objectsName]: [],
              objects: [],
              // 新建物件的时候保存的对象
              newObject: {},
              connection: _this.getConnection(),
              objectLoading: false,
              objectsLoading: false,
              submitting: false,
              deleting: false,
              creating: false,
              updating: false,
              page: 1,
              editing: false,
            };
          },
          getters: {
            [`normal${classesName}`]: (store: Store & Record<string, any>) => {
              return _.filter(store[objectsName], (object) => !object._destroy);
            },
            [`${objectsName}Hash`]: (store: Store & Record<string, any>) => {
              const hash: AnyObject = {};
              _.each(store[objectsName], (i) => {
                hash[i.id] = i;
              });
              return hash;
            },
          },
          actions: {
            loadMore(
              this: Store & Record<string, any>, // eslint-disable-line
              payload: AnyObject
            ): Promise<any> {
              const args = payload;
              args.paged = true;
              const stateName = `connection`;
              const originalConnection = this[stateName];
              console.log('originalConnection', originalConnection, stateName);
              const result = this.loadMore(args, originalConnection);
              result.then((connection: any) => {
                this.$patch({ connection });
              });
              return result;
            },
            findAllWithCache(options: AnyObject = {}) {
              if (_this[objectsName].length) {
                return Promise.resolve(_this[objectsName]);
              }
              return _this.findAll(options);
            },
            findAll(this: Store, options: AnyObject = {}) { // eslint-disable-line
              const loadingName = `objectsLoading`;
              this.$patch({ [loadingName]: true });
              return _this
                .findAll(options)
                .then((response: any) => {
                  this.$patch({ [_this.objectsName]: response });
                  return response;
                })
                .finally(() => {
                  this.$patch({ [loadingName]: false });
                });
            },
            update(attributes: AnyObject | Resource) {
              const { id } = attributes;
              if (!id) {
                return Promise.reject(new Error('attributes have no id'));
              }
              const objects = this[objectsName];
              const index = _.findIndex(objects, { id });
              console.log('index', index);
              if (index > -1) {
                objects.splice(index, 1, new _this(attributes));
              }
              return Promise.resolve();
            },
            find(this: Store, id: ID, options: any = {}) { // eslint-disable-line
              const loadingName = `objectLoading`;
              this.$patch({ [loadingName]: true });
              return _this
                .find(id, options)
                .then((response: any) => {
                  this.$patch({ [_this.objectName]: response });
                  return response;
                })
                .finally(() => {
                  this.$patch({ [loadingName]: false });
                });
            },
            reload(this: Store & Record<string, any>) { //eslint-disable-line
              const object = this[_this.objectName];
              if (object) {
                return this.find({ id: object.id });
              }
              console.log('object not load, skip.');
              return null;
            },
            // 删除记录，并从collection中移除
            destroy(id: string | Resource) {
              let resource = id;
              if (_.isString(id)) {
                resource = new _this({ id });
              }
              return (resource as Resource)
                .destroy()
                .then((data) => {
                  // 从列表中删除
                  this.remove((resource as Resource).id);
                  return data;
                })
                .catch(() => {
                  return null;
                });
            },
            // 从 store 中删除
            remove(id: string | Resource) {
              console.log('remove id', id);
              id = _.isString(id) ? id : id.id;
              const objects = this[_this.objectsName];
              const index = _.findIndex(objects, { id });
              console.log('found index', index);
              if (index > -1) {
                objects.splice(index, 1);
                // this.$patch({ [_this.objectsName]: objects });
              }
            },
            create(attributes: AnyObject, saveOptions: AnyObject = {}) {
              const object = new _this(attributes);
              return object.save(saveOptions);
            },
          },
        };
        // 合并策略， 因为state是函数，所所以合并的时候，需要调用之后，再合并为一个新的函数
        const storeState: AnyObject = storeConfig?.state?.() || {};
        const originalState = originalStoreConfig.state();
        const newStoreConfig = {
          ..._.merge(originalStoreConfig, storeConfig),
          ...{
            state() {
              const mergedState = {
                ...originalState,
                ...storeState,
              };
              /*
              console.log(
                'merged state',
                originalState,
                storeState,
                mergedState
              );
              */
              return mergedState;
            },
          },
        };
        return defineStore(newStoreConfig.id, newStoreConfig);
      },
    },
  };

  return mod;
};

export { parseMapOption };
export default useModule;
