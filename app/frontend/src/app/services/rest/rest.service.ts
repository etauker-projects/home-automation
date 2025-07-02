import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { EntityFile, EntityMetadata, Module, TemplateFile, TemplateMetadata } from '../../pages/module/module.interfaces';


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

  public async getModules(): Promise<Module[]> {
    const endpoint = `${this.host}/modules`;
    const response = this.http.get<Module[]>(endpoint);
    return firstValueFrom(response)
  }

  public async getTemplateFiles(moduleId: string): Promise<TemplateMetadata[]> {
    const endpoint = `${this.host}/modules/${moduleId}/templates`;
    const response = this.http.get<TemplateMetadata[]>(endpoint);
    return firstValueFrom(response)
  }

  public async getTemplateFile(moduleId: string, templateId: string): Promise<TemplateFile> {
    const endpoint = `${this.host}/modules/${moduleId}/templates/${templateId}`;
    const response = this.http.get<TemplateFile>(endpoint);
    return firstValueFrom(response);
  }

  public async getEntityFiles(moduleId: string, templateId: string): Promise<EntityMetadata[]> {
    const endpoint = `${this.host}/modules/${moduleId}/templates/${templateId}/entities`;
    const response = this.http.get<EntityMetadata[]>(endpoint);
    return firstValueFrom(response)
  }

  public async postEntityFile(moduleId: string, templateId: string, file: EntityFile): Promise<EntityFile> {
    const endpoint = `${this.host}/modules/${moduleId}/templates/${templateId}/entities`;
    const response = this.http.post<EntityFile>(endpoint, file);
    return firstValueFrom(response);
  }
}
