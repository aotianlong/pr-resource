import { ResourceClass } from '../types';

const resourceClasses: Record<string, ResourceClass> = {};
export function getResourceClass(name: string) {
  return resourceClasses[name];
}
export function addResourceClass(name: string, resourceClass: any) {
  resourceClasses[name] = resourceClass;
}
export { resourceClasses };
export default resourceClasses;
