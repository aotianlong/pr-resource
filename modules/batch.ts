import gql from 'graphql-tag';
import _ from 'lodash';
import { ModuleDefinition, BuildGqlOptions, Resource } from '../types';

class QueryBuilder {
  resource: Resource;

  index: number;

  constructor(resource: Resource, index = 0) {
    this.resource = resource;
    this.index = index;
  }

  aliasName(name: string) {
    return `${name}_${this.index}`;
  }

  get actionName() {
    const { className } = this.resource.klass;
    const actionName = `update${className}`;
    const aliasName = this.aliasName(actionName);
    return `${aliasName}:${actionName}`;
  }

  get attributesTypeName() {
    const name = [this.resource.klass.className, 'Attributes'].join('');
    return name;
  }

  get idName() {
    return this.aliasName('id');
  }

  get attributesName() {
    return this.aliasName('attributes');
  }

  // $id_0: NodeId!, $attributes_0: NodeAttributesUpdateInput!
  get variableDefinitions() {
    return `$${this.idName}: NodeId!, $${this.attributesName}: ${this.attributesTypeName}!`;
  }

  get objectName() {
    return this.resource.klass.objectName;
  }

  get variables() {
    const attributes = _.cloneDeep(this.resource.getAttributes());
    delete attributes.id;
    return {
      [this.idName]: this.resource.id,
      [this.attributesName]: attributes,
    };
  }

  build(options: BuildGqlOptions = {}) {
    const str = `${this.actionName}(id: $${this.idName}, attributes: $${this.attributesName}) {
      errors
      ${this.objectName} {
        id
      }
    }`;
    return str;
  }
}

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    attributes: {
      _queryBuilder: null,
    },
    initialize() {
      this._queryBuilder = null;
    },
    computed: {
      queryBuilder() {
        if (!this._queryBuilder) {
          const queryBuilder = new QueryBuilder(this);
          this._queryBuilder = queryBuilder;
        }
        return this._queryBuilder;
      },
    },
    classMethods: {
      batchUpdate(...resources: Resource[]) {
        resources = _.flatten(resources);
        const variableDefinitions: string[] = [];
        const queries: string[] = [];
        const combinedVariables = {};
        _.each(resources, (resource, index) => {
          resource.queryBuilder.index = index;
          variableDefinitions.push(resource.queryBuilder.variableDefinitions);
          queries.push(resource.queryBuilder.build());
          Object.assign(combinedVariables, resource.queryBuilder.variables);
        });
        const combinedVariableDefinitions = variableDefinitions.join(', ');
        const combinedQueries = queries.join('\n');
        const str = `
        mutation(${combinedVariableDefinitions}) {
          ${combinedQueries}
        }
        `;
        console.log(str, combinedVariables);
        // 开始提交mutation
        return this.$apollo
          .mutate({
            mutation: gql`
              ${str}
            `,
            variables: combinedVariables,
          })
          .then((result) => {
            const results: any[] = [];
            const keys = Object.keys(result.data);
            _.each(keys, (key) => {
              results.push(result.data[key]);
            });
            return results;
          });
      },
      batchDestroy(...resources: Resource[]) {
        resources = _.flatten(resources);
        const queries: string[] = [];
        const combinedVariables = {};
        const variableDefinitions: string[] = [];
        _.map(resources, (resource, index) => {
          const { queryBuilder } = resource;
          queryBuilder.index = index;
          const actionName = queryBuilder.aliasName('deleteNode');
          const variables = {
            [queryBuilder.idName]: resource.id,
          };
          const query = `${actionName}:deleteNode(id: $${queryBuilder.idName}, isSoft: true) {
            errors
          }`;
          Object.assign(combinedVariables, variables);
          queries.push(query);
          const variableDefinition = `${queryBuilder.idName}: NodeId!`;
          variableDefinitions.push(variableDefinition);
        });
        const combinedQueries = queries.join('\n');
        const combinedVariableDefinitions = variableDefinitions.join(', ');
        const str = `mutation(${combinedVariableDefinitions}) {
          ${combinedQueries}
        }`;
        console.log(str, combinedVariables);
      },
      batchCreate(resources: Resource[]) {},
    },
  };
  return mod;
};

export default useModule;
