import schemaData from '@/auto_generated/schema.json';
import _ from 'lodash';
import Schema from './schema';

const schema = new Schema(schemaData);

describe('Schema', () => {
  it('should have the expected types', () => {
    expect(_.isArray(schema.types)).toBe(true);
  });

  it('should have the expected types hash', () => {
    expect(_.isPlainObject(schema.typesHash)).toBe(true);
  });
});
