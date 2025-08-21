import { parse, stringify } from 'yaml';
import { Injectable } from '@angular/core';

export interface Node {
  key: string;
  json: object;
  yaml: string;
  type: 'array' | 'object';
};

@Injectable({
  providedIn: 'root'
})
export class YamlService {
  private readonly regexString = '\\${\\s*input\\.KEY\\s*}';

  constructor() { }

  public getType(obj: object): 'array' | 'object' {
    if (Array.isArray(obj)) {
      return 'array';
    } else if (typeof obj === 'object') {
      return 'object';
    } else {
      throw Error(`Invalid yaml type: ${typeof obj}`);
    }
  }

  public split(document: string): Node[] {
    const entities = parse(document);
    let result: Node[];

    if (this.getType(entities) === 'array') {
      result = (entities as any[]).map((entity, index) => {
        const json = parse(JSON.stringify(entity));
        const yaml = stringify(json, { indent: 2 });
        return { json, yaml, key: entity['name'], type: 'array' };
      });
    } else {
      result = Object.keys(entities).map(key => {
        const obj: { [key: string]: any } = {};
        obj[key] = entities[key];
        const json = parse(JSON.stringify(obj));
        const yaml = stringify(json, { indent: 2 });
        return { json, yaml, key, type: 'object' };
      }, {} as { [key: string]: any });
    }

    return result;
  }
}
