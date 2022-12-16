import _ from 'lodash';
import type {
  GetFunction,
  ModuleDefinition,
  Resource as ResourceType,
  SetFunction,
  AnyObject,
} from '../../types';
import createProxyHandler from '../proxy-handler';

const modules: ModuleDefinition[] = [];
const sets: SetFunction[] = [];
const gets: GetFunction[] = [];
const initializers: (() => void)[] = [];
const mountedCallbacks: ((klass: any) => void)[] = [];

function use(module: ModuleDefinition | (() => ModuleDefinition)) {
  if (_.isFunction(module)) {
    module = module();
  }
  modules.push(module);
  applyModule(Resource, module);
}

function applyModule(Klass, module: ModuleDefinition) {
  const {
    mounted,
    initialize,
    get,
    set,
    classMethods,
    classAttributes,
    methods,
    computed,
    attributes,
  } = module;

  if (get) {
    gets.push(get);
  }
  if (set) {
    sets.push(set);
  }
  if (initialize) {
    initializers.push(initialize);
  }
  if (mounted) {
    mountedCallbacks.push(mounted);
  }

  if (classMethods) {
    Object.assign(Klass, classMethods);
  }
  if (classAttributes) {
    Object.assign(Klass, classAttributes);
  }
  if (methods) {
    Object.assign(Klass.prototype, methods);
  }
  if (computed) {
    _.each(computed, (v, k) => {
      if (_.isFunction(v)) {
        Object.defineProperty(Klass.prototype, k, {
          get: v,
          enumerable: true,
          configurable: true,
        });
      } else if (_.isPlainObject(v)) {
        Object.defineProperty(Klass.prototype, k, {
          get: v.get,
          set: v.set,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    });
  }
  if (attributes) {
    Object.assign(Klass.prototype, attributes);
  }
  // module.mounted?.bind(Klass)(Klass);
}

const Resource = function Resource(
  this: ResourceType,
  attributes: AnyObject | ResourceType = {},
  opts: AnyObject = {}
) {
  if (attributes._isResource) {
    this._attributes = attributes._attributes as AnyObject;
  } else {
    // this._attributes = reactive(attributes);
    this._attributes = attributes;
  }
  // 设置属性
  // console.log('initializers', initializers)
  _.each(initializers, (initializer) => {
    initializer.bind(this)();
  });

  this.klass.runHooks('initialize', this);

  // 自动设置__typename
  if (!this._attributes.__typename) {
    this._attributes.__typename = this.klass.name;
  }

  // 返回一个对本实例的代理对象
  const proxyHandler = createProxyHandler(gets, sets);
  const proxy = new Proxy(this, proxyHandler);
  this.$proxy = proxy;
  return proxy;
};

Resource.prototype._isResource = true;
Resource.prototype.klass = Resource;
Resource._isResourceClass = true;
/*
Resource.from = (this: ResourceClass, attrs = []): any[] {
  const Klass = this;
  return attrs.map((attr) => new Klass(attr));
},
*/

export { use, mountedCallbacks };
export default Resource;
