import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class RestService {

  private host: string = 'http://localhost:9999/home-automation/v1';

  constructor(
    private http: HttpClient,
  ) { }

  public async getStatus(): Promise<{ status: string, mode: string, time: string }> {
    const endpoint = `${this.host}/status`;
    const response = this.http.get<{ status: string, mode: string, time: string }>(endpoint);
    return firstValueFrom(response)
  }

  public async getModules(): Promise<any> {
    const endpoint = `${this.host}/modules`;
    const response = this.http.get<any>(endpoint);
    return firstValueFrom(response)
  }

  public async getTemplates(moduleId: string): Promise<any> {
    const endpoint = `${this.host}/modules/${moduleId}/templates`;
    const response = this.http.get<any>(endpoint);
    return firstValueFrom(response)
  }

  public async getEntities(moduleId: string): Promise<any> {
    const endpoint = `${this.host}/modules/${moduleId}/entities`;
    const response = this.http.get<any>(endpoint);
    return firstValueFrom(response)
  }

  public async getTemplate(moduleId: string, templateId: string): Promise<any> {
    // const endpoint = `${this.host}/modules/${moduleId}/templates/${templateId}`;
    // const response = this.http.get<any>(endpoint);
    // return firstValueFrom(response);
    return Promise.resolve({
      content: `
\${ input.id }_energy_usage_hourly:
    name: \${ input.name } Energy Usage Hourly
    source: sensor.\${ input.id }_energy
    cycle: hourly
    unique_id: meter.\${ input.id }_energy_usage_hourly
    offset: 0
    delta_values: false
\${ input.id }_energy_usage_daily:
    name: \${ input.name } Energy Usage Daily
    source: sensor.\${ input.id }_energy
    cycle: daily
    unique_id: meter.\${ input.id }_energy_usage_daily
    offset: 0
    delta_values: false
\${ input.id }_energy_usage_monthly:
    name: \${ input.name } Energy Usage Monthly
    source: sensor.\${ input.id }_energy
    cycle: monthly
    unique_id: meter.\${ input.id }_energy_usage_monthly
    offset: 0
    delta_values: false`.trim()
      });
  }

//   public async getEntity(moduleId: string, entityId: string): Promise<any> {
//     // const endpoint = `${this.host}/modules/${moduleId}/entities/${entityId}`;
//     // const response = this.http.get<any>(endpoint);
//     // return firstValueFrom(response);
//     return Promise.resolve(`
// \${ input.id }_energy_usage_hourly:
//     name: \${ input.name } Energy Usage Hourly
//     source: sensor.\${ input.id }_energy
//     cycle: hourly
//     unique_id: meter.\${ input.id }_energy_usage_hourly
//     offset: 0
//     delta_values: false
// \${ input.id }_energy_usage_daily:
//     name: \${ input.name } Energy Usage Daily
//     source: sensor.\${ input.id }_energy
//     cycle: daily
//     unique_id: meter.\${ input.id }_energy_usage_daily
//     offset: 0
//     delta_values: false
// \${ input.id }_energy_usage_monthly:
//     name: \${ input.name } Energy Usage Monthly
//     source: sensor.\${ input.id }_energy
//     cycle: monthly
//     unique_id: meter.\${ input.id }_energy_usage_monthly
//     offset: 0
//     delta_values: false`.trim())
//   }

  // public async getTemplate<T>(): Promise<{ status: string, mode: string, time: string }> {
  //   const endpoint = `${this.host}/template`;
  //   const response = this.http.get<{ status: string, mode: string, time: string }>(endpoint);
  //   return firstValueFrom(response)
  // }

  // modules
  // templates
  // entities
}
