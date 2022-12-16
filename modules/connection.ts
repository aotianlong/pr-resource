import _ from 'lodash';
import inflection from 'inflection';
import {
  FindOptions,
  ModuleDefinition,
  ResourceClass,
  Resource,
  ConnectionQueryOptions,
} from '../types';

import { Connection } from '../lib/connection';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    initialize() {
      this._connections = {};
    },
    classAttributes: {
      _connection: null,
    },
    mounted() {},
    attributes: {
      _connections: {},
    },
    classMethods: {
      // 这个不能使用缓存,因为如果页面上有多个的话, 会导致混乱
      getConnection() {
        if (this._connection) {
          // return this._connection;
        }
        const connection = Connection.fromResourceClass(this);
        this._connection = connection;
        return connection;
      },
    },
    methods: {
      getConnection(connectionName: string) {
        console.log('start get connection', connectionName);
        if (this._connections[connectionName]) {
          console.log('connection from cache');
          return this._connections[connectionName];
        }
        console.log('brand new connection');
        const connection = Connection.fromResource(this, connectionName);
        this._connections[connectionName] = connection;
        return connection;
      },
    },
  };
  return mod;
};

export { Connection };

export default useModule;
