import { FetchPolicy } from 'apollo-client';
import gql from 'graphql-tag';
import _ from 'lodash';
import {
  FindOptions,
  ID,
  ModuleDefinition,
  Resource,
  ResourceClass,
  Connection,
  AnyObject,
} from '../types';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    classMethods: {
      // 获取所有原始数据
      findAll(
        this: ResourceClass,
        options: FindOptions = {}
      ): Promise<Resource[]> {
        return this.findAllRaw(options).then((connection) => {
          const resources: Resource[] = [];
          _.map(connection.nodes, (n) => {
            if (n) {
              resources.push(new this(n as AnyObject));
            }
          });
          return resources;
        });
      },

      find(id: ID | ID[], options: FindOptions = {}) {
        return this.findRaw(id, options).then((data) => {
          if (_.isArray(data)) {
            return data.map((d) => new this(d));
          }
          return new this(data as AnyObject);
        });
      },

      findAllRaw(options: FindOptions = {}): Promise<Connection> {
        const name = this.objectsName;
        const gqlStr = this.buildGql(options);
        console.log('findAll gql:', gqlStr);
        const query = gql`
          ${gqlStr}
        `;
        const variables = _.cloneDeep(options.variables || {});
        const result = this.$apollo.query({
          query,
          variables,
          fetchPolicy: options.fetchPolicy || 'network-only', // cache-first no-cache
        });
        return result
          .then((response) => {
            const data = response.data[name];
            if (response.errors) {
              return Promise.reject(response.errors);
            }
            return data;
          })
          .catch((e: Error) => Promise.reject(e));
      },
      // find 现在可以直接从node接口中获取
      findRaw(
        this: ResourceClass,
        id: ID | ID[],
        options: FindOptions = {}
      ): Promise<AnyObject | AnyObject[]> {
        const maxDepth = 3;
        id = this.ensureNodeId(id);
        const variables = _.cloneDeep(options.variables || {});
        variables.ids = _.flatten([id]);
        const multiple = _.isArray(id);

        console.log('maxDepth:', maxDepth);
        const columns = this.buildColumns(
          options.columns || this.type.toQueryString({ maxDepth })
        );
        const fragmentName = options.fragmentName || this.className;

        return new Promise((resolve, reject) => {
          if (!id) {
            reject(new Error('invalid id'));
            return;
          }

          const gqlStr = `
          query findNodes($ids: [NodeId!]!) {
            nodes(ids: $ids){
              ... on ${fragmentName} {
                ${columns}
              }
            }
          }
        `;

          console.log('find gql:', gqlStr);

          const query = {
            query: gql`
              ${gqlStr}
            `,
            variables,
            fetchPolicy: 'network-only' as FetchPolicy,
          };
          this.$apollo
            .query(query)
            .then((result) => {
              const nodes = _.get(result, 'data.nodes');
              if (nodes.length) {
                if (multiple) {
                  resolve(nodes);
                } else {
                  resolve(nodes[0]);
                }
              } else {
                reject(result);
              }
            })
            .catch((error) => {
              reject(error);
            });
        });
      },
    },
  };
  return mod;
};

export default useModule;
