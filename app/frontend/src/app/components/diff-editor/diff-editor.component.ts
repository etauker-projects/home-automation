import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule, type DiffEditorModel } from 'ngx-monaco-editor-v2';

@Component({
  selector: 'app-diff-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MonacoEditorModule],
  templateUrl: './diff-editor.component.html',
  styleUrl: './diff-editor.component.css'
})
export class DiffEditorComponent {

  @Input() original: string = '';
  @Input() modified: string = '';

  options = {
    theme: 'vs-light',
    automaticLayout: true,
    readOnly: true,
    renderSideBySide: true,
    renderIndicators: false,
    renderMarginRevertIcon: true,
    renderOverviewRuler: false,
    renderLineHighlight: 'all',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    // minimap: {
    //   enabled: false,
    //   side: 'right',
    //   showSlider: 'mouseover',
    //   renderCharacters: true,
    //   size: 'proportional',
    //   scale: 1,
    //   show: 'always'
    // },
    fontSize: 14,
    fontFamily: 'monospace',
    lineNumbers: 'off',
    // lineNumbersMinChars: 3,
    // folding: false,
    foldingStrategy: 'auto',
    contextmenu: false,
    // quickSuggestions: {
    //   other: true,
    //   comments: true,
    //   strings: true
    // },
    // suggestOnTriggerCharacters: true,
    // acceptSuggestionOnEnter: 'off',
    // acceptSuggestionOnCommitCharacter: true,
    // tabSize: 4,
    // insertSpaces: true,
    // detectIndentation: true,
    // autoClosingBrackets: 'languageDefined',
    // autoClosingQuotes: 'languageDefined',
    // autoIndent: 'advanced',
    // formatOnType: true,
    // formatOnPaste: true,
    renderWhitespace: 'boundary',
    // renderControlCharacters: true,
    // overviewRulerLanes: 3,
    // overviewRulerBorder: false,
    // stickyScroll: {
    //   enabled: true,
    //   maxLineCount: 5
    // },
  };

  originalModel: DiffEditorModel = {
    code: this.original,
    language: 'application/yaml'
  };

  modifiedModel: DiffEditorModel = {
    code: this.modified,
    language: 'application/yaml'
  };

  ngOnChanges() {
    this.originalModel = {
      ...this.originalModel,
      code: this.original,
    };
    this.modifiedModel = {
      ...this.modifiedModel,
      code: this.modified,
    };
  }
}
