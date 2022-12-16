import _ from 'lodash';
import { Schema as Data } from '../types';
import Type from './schema/type';
import type Field from './schema/field';

type TypesHash = Record<string, Type>;

class Schema {
  data: Data;

  constructor(data: Data) {
    this.data = data;
  }

  getQuery(name: string) {
    return this.getField(this.data.queryType.name as string, name);
  }

  getMutation(name: string) {
    return this.getField(this.data.mutationType.name as string, name);
  }

  getSubscription(name: string) {
    return this.getField(this.data.subscriptionType.name as string, name);
  }

  /**
   * schema.getType('Post')
   * schema.getType('Post').getField('id')
   * schema.getType('Post').getInputField('id')
   */
  getType(name: string) {
    return this.typesHash[name];
  }

  /**
   * schema.getInputField('Post', 'id')
   * @param typeName
   * @param inputFieldName
   * @returns InputValue | undefined
   */
  getInputField(typeName: string, inputFieldName: string) {
    return this.getType(typeName)?.getInputField(inputFieldName);
  }

  /**
   * schema.getField('Post', 'id')
   * @param typeName
   * @param fieldName
   * @returns Field | undefined
   */
  getField(typeName: string, fieldName: string): Field | null {
    return this.getType(typeName)?.getField(fieldName);
  }

  get directives() {
    return this.data.directives || [];
  }

  get types(): Type[] {
    const schema = this;
    return this.data.types?.map((type) => new Type(schema, type)) || [];
  }

  get typesHash(): TypesHash {
    return _.keyBy(this.types, 'name');
  }
}

export type { Schema };
export default Schema;
