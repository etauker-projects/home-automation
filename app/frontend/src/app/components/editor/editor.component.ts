import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
// import { editor } from 'monaco-editor';
import { MonacoEditorModule, type DiffEditorModel } from 'ngx-monaco-editor-v2';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MonacoEditorModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css'
})
export class EditorComponent {

  editorOptions = { theme: 'vs-dark', language: 'javascript' };
  code: string = 'function x() {\nconsole.log("Hello world!");\n}';


  options = {
    theme: 'vs-dark'
  };
  originalModel: DiffEditorModel = {
    code: 'heLLo world!',
    language: 'text/plain'
  };

  modifiedModel: DiffEditorModel = {
    code: 'hello orlando!',
    language: 'text/plain'
  };
}
