const inferFormFieldTypeByType = (type: string) => {
  // const type = field?.type;
  // 根据类型
  let result = null;
  if (type === 'Boolean') {
    result = 'boolean';
  }
  if (type === 'Time') {
    result = 'date';
  }
  if (type === 'Int' || type === 'Number') {
    result = 'number';
  }
  return result;
};

const inferFormFieldTypeByName = (name: string) => {
  let result = null;
  if (name === 'locationId') {
    result = 'location';
  }
  if (name === 'categoryId') {
    result = 'category';
  }
  if (name === 'imageId') {
    result = 'attachable';
  }
  if (name === 'imageIds') {
    result = 'attachable';
  }
  if (name === 'body' || name === 'content') {
    result = 'editor';
  }
  if (name === 'tagList') {
    result = 'tag';
  }
  if (name === 'description') {
    result = 'textarea';
  }
  if (name.startsWith('is')) {
    result = 'boolean';
  }
  if (name.endsWith('At') || name.endsWith('On')) {
    result = 'date';
  }
  return result;
};

const inferFormFieldType = (name: string, type: string) => {
  return (
    inferFormFieldTypeByType(type) || inferFormFieldTypeByName(name) || 'string'
  );
};

const inference = {};

export {
  inferFormFieldTypeByName,
  inferFormFieldType,
  inferFormFieldTypeByType,
};
export default inference;
