import { InputValue as RawInputValue, Type as RawType } from '../../types';
import OfType from './of-type';
import type { Schema } from '../schema';

class InputValue {
  data: RawInputValue;

  schema: Schema;

  constructor(schema: Schema, data: RawInputValue) {
    this.data = data;
    this.schema = schema;
  }

  get name() {
    return this.data.name;
  }

  get fullType() {
    return this.type.fullType;
  }

  get type() {
    return new OfType(this.schema, this.data.type);
  }

  get description() {
    return this.data.description;
  }

  get defaultValue() {
    return this.data.defaultValue;
  }
}

export default InputValue;
