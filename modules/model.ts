import _ from 'lodash';
import { ModuleDefinition, AnyObject } from '../types';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    // 变成一个vuex可用的model对象
    classMethods: {
      toModule(module = {}) {
        return this.toModel(module);
      },
      // 参数可以是一个function
      toModel(model = {}) {
        if (_.isFunction(model)) {
          const m = this.toModel();
          return _.merge(m, model(m));
        }
        const _this = this;
        const state: AnyObject = {};
        // let collectionName = inflection.capitalize(this.objectsName)
        const collectionName = this.objectsName;
        state.class = this;
        state[this.objectName] = null;
        state[this.objectsName] = [];
        // 新建物件的时候保存的对象
        state.newObject = null;
        state[`${this.objectName}Connection`] = null;
        state[`${this.objectsName}Loading`] = false;
        state[`${this.objectName}Loading`] = false;
        state.submitting = false;
        state.page = 1;
        state.editing = false;

        // console.log(collectionName)

        const getters: AnyObject = {};
        getters[collectionName] = function getter(oState) {
          return _.get(oState, `${_this.objectName}Connection.nodes`, []);
        };

        /*
        getters.buildQuery = function (context, options = {}) {
          return _this.buildQuery(options)
        }
        */

        const defaultModel = {
          namespaced: true,
          state,
          getters,
          mutations: {
            setState(oState, newState) {
              Object.assign(oState, newState);
            },
            [`set${_this.className}`](oState, newState) {
              oState[_this.objectName] = newState;
            },
            [`set${collectionName}`](oState, newState) {
              oState[_this.objectsName] = newState;
            },
            [`set${_this.className}Connection`](oState, connection) {
              oState[`${_this.objectName}Connection`] = connection;
            },
            setNewObject(oState, object) {
              oState.newObject = object;
            },
            // todo: insert element
            insert(oState, object) {
              console.log('not implement yet');
            },
            // 从列表中删除一个元素
            remove(oState, idOrObject) {
              if (_.isUndefined(idOrObject)) {
                console.log('idOrObject is undefined, return.');
                return;
              }
              let id = idOrObject;
              if (_.isObject(idOrObject)) {
                id = idOrObject.id;
              }
              const objects = oState[_this.objectsName];
              const newObjects = _.filter(objects, (i) => i.id !== id);
              oState[_this.objectsName] = newObjects;
            },
            // 根据object.id更新列表中的元素
            update(oState, object) {
              const objects = oState[_this.objectsName];
              const newObjects = _.map(objects, (o) => {
                if (object.id === o.id) {
                  return object;
                }
                return o;
              });
              oState[_this.objectsName] = newObjects;
              return newObjects;
            },
            prepend(oState, object) {
              return oState[_this.objectsName].unshift(object);
            },
            append(oState: AnyObject, object) {
              return oState[_this.objectsName].push(object);
            },
          },
          actions: {
            loadMore(context, payload) {
              const args = payload;
              args.paged = true;
              const stateName = `${_this.objectName}Connection`;
              const originalConnection = context.state[stateName];
              console.log('originalConnection', originalConnection, stateName);
              const result = _this.loadMore(args, originalConnection);
              result.then((connection) => {
                context.commit(`set${_this.className}Connection`, connection);
              });
              return result;
            },
            findAll(context, payload) {
              payload = {
                options: {},
                ...payload,
              };
              const loadingName = `${_this.objectsName}Loading`;
              context.commit('setState', { [loadingName]: true });
              return _this
                .findAll(payload.options)
                .then((response) => {
                  context.commit('setState', { [_this.objectsName]: response });
                  return response;
                })
                .finally(() => {
                  context.commit('setState', { [loadingName]: false });
                });
            },
            update(context, payload) {
              payload = {
                attributes: {},
                saveOptions: {},
                ...payload,
              };
              const object = new _this(payload.attributes);
              return object.save(payload.saveOptions);
            },
            find(context, payload) {
              const { id, options } = payload;
              const loadingName = `${_this.objectName}Loading`;
              context.commit('setState', { [loadingName]: true });
              return _this
                .find(id, options)
                .then((response) => {
                  context.commit('setState', { [_this.objectName]: response });
                  return response;
                })
                .finally(() => {
                  context.commit('setState', { [loadingName]: false });
                });
            },
            reload(context, payload) {
              const object = context.state[_this.objectName];
              if (object) {
                return context.dispatch('find', { id: object.id });
              }
              console.log('object not load, skip.');
              return true;
            },
            destroy(context, payload) {
              const { id } = payload;
              return _this
                .destroy(id)
                .then((data) => {
                  // 从列表中删除
                  context.commit('remove', id);
                })
                .catch(() => {
                  return null;
                });
            },
            create(context, payload) {
              payload = {
                saveOptions: {},
                attributes: {},
                ...payload,
              };
              const { attributes, saveOptions } = payload;
              const object = new _this(attributes);
              return object.save(saveOptions);
            },
            // action返回的是promise, 无法直接使用，所以取消了这个
            // buildQuery (context, options = {}) {
            //   return _this.buildQuery(options)
            // },
            call(context, payload) {
              const { method, args } = payload;
              return _this[method](...args);
            },
          },
        };
        const mergedModel = _.merge(defaultModel, model);
        /*
        let mergedModel = Object.assign({}, defaultModel)
        Object.assign(mergedModel.actions, model.actions)
        */
        // console.log('merged model', mergedModel)
        return mergedModel;
      },
    },
  };
  return mod;
};

export default useModule;
