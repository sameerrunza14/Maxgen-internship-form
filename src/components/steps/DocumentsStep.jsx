import { FileUpload } from '../ui/FileUpload';
import { DOCUMENTS } from '../../constants/formOptions';

function DocumentsStep({ files, errors, onFileSelect, onFileRemove, onFileError }) {
  return (
    <div>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-[13px] leading-relaxed text-brand-800">
        <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
        <p>
          Your documents are used only to verify your application and are visible only to the Maxgen HR team. Make sure
          scans are clear and readable.
        </p>
      </div>

      <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
        {DOCUMENTS.map(function (config) {
          return (
            <FileUpload
              key={config.name}
              config={config}
              file={files[config.name]}
              error={errors[config.name]}
              onSelect={onFileSelect}
              onRemove={onFileRemove}
              onError={onFileError}
            />
          );
        })}
      </div>
    </div>
  );
}

export default DocumentsStep;
