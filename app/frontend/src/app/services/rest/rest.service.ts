import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class RestService {

  private host: string = 'http://localhost:9999/home-automation/v1/templating';

  constructor(
    private http: HttpClient,
  ) { }

  public async getStatus(): Promise<{ status: string, mode: string, time: string }> {
    const endpoint = `http://localhost:9999/home-automation/v1/status`;
    const response = this.http.get<{ status: string, mode: string, time: string }>(endpoint);
    return firstValueFrom(response)
  }

  public async getModules(): Promise<any> {
    const endpoint = `${this.host}/modules`;
    const response = this.http.get<any>(endpoint);
    return firstValueFrom(response)
  }

  public async getTemplateFiles(moduleId: string): Promise<string[]> {
    const endpoint = `${this.host}/modules/${moduleId}/template-files`;
    const response = this.http.get<string[]>(endpoint);
    return firstValueFrom(response)
  }

  public async getEntityFiles(moduleId: string): Promise<{ id: string; path: string; templatePath: string }[]> {
    const endpoint = `${this.host}/modules/${moduleId}/entity-files`;
    const response = this.http.get<{ id: string; path: string; templatePath: string }[]>(endpoint);
    return firstValueFrom(response)
  }

  public async getTemplateFile(moduleId: string, templatePath: string): Promise<any> {
    const endpoint = `${this.host}/modules/${moduleId}/template-files/${encodeURIComponent(templatePath)}`;
    const response = this.http.get<any>(endpoint);
    return firstValueFrom(response);
  }
}
