import { parse, stringify } from 'yaml';
import { Injectable } from '@angular/core';

export interface Section {
  title: string;
  template: string;
  output: string;
  variables: { [key: string]: string };
};

@Injectable({
  providedIn: 'root'
})
export class YamlService {

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

  public split(document: string): object | object[] {
    const entities = parse(document);

    let result;
    if (this.getType(entities) === 'array') {
      result = (entities as object[]).map(entity => parse(JSON.stringify(entity)));
    } else {
      result = Object.keys(entities).reduce((json, key) => {
        json[key] = entities[key];
        return parse(JSON.stringify(json));
      }, {} as { [key: string]: any });
    }

    return result;
  }
}
