import { useState } from "react";

export interface CellActionsProps {
  value?: string;
  variableName?: string;
  onCopyVariable?: () => void;
}

export const CellActions = ({ value, variableName, onCopyVariable }: CellActionsProps) => {
  const [showTooltip, setShowTooltip] = useState<'copy' | 'variable' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<'copy' | 'variable' | null>(null);

  const handleCopyValue = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Try modern clipboard API first
      if (value && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        console.log('Value copied to clipboard (modern API):', value);
        setShowConfirmation('copy');
        setTimeout(() => setShowConfirmation(null), 1500);
        return;
      }
    } catch (err) {
      console.log('Modern clipboard API failed, trying fallback:', err);
    }

    // Fallback method using textarea and execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value || '';
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        console.log('Value copied to clipboard (fallback):', value);
        setShowConfirmation('copy');
        setTimeout(() => setShowConfirmation(null), 1500);
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (fallbackErr) {
      console.error('Failed to copy value to clipboard:', fallbackErr);
      alert('Failed to copy to clipboard. Please copy manually.');
    }
  };

  const handleCopyVariable = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!variableName) {
      console.warn('No variable name provided');
      return;
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(variableName);
        console.log('Variable copied to clipboard (modern API):', variableName);
        if (onCopyVariable) onCopyVariable();
        setShowConfirmation('variable');
        setTimeout(() => setShowConfirmation(null), 1500);
        return;
      }
    } catch (err) {
      console.log('Modern clipboard API failed, trying fallback:', err);
    }

    // Fallback method using textarea and execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = variableName;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        console.log('Variable copied to clipboard (fallback):', variableName);
        if (onCopyVariable) onCopyVariable();
        setShowConfirmation('variable');
        setTimeout(() => setShowConfirmation(null), 1500);
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (fallbackErr) {
      console.error('Failed to copy variable to clipboard:', fallbackErr);
      alert('Failed to copy to clipboard. Please copy manually.');
    }
  };

  if (showConfirmation) {
    return (
      <div className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 rounded whitespace-nowrap">
        {showConfirmation === 'copy' ? 'Wert kopiert' : 'Variable kopiert'}
      </div>
    );
  }

  return (
    <div className="flex gap-2 ml-1.5">
      {/* Copy Value Button */}
      <div
        className="relative"
        onMouseEnter={() => setShowTooltip('copy')}
        onMouseLeave={() => setShowTooltip(null)}
      >
        <button
          className="p-0 hover:opacity-70 transition-opacity cursor-pointer color-primary"
          tabIndex={-1}
          type="button"
          onClick={handleCopyValue}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 -960 960 960"
            aria-label="content_copy"
            fill="currentColor"
          >
            <path d="M314.7-195.48q-32.51 0-55.87-23.35-23.35-23.36-23.35-55.87v-549.82q0-32.74 23.35-56.26 23.36-23.53 55.87-23.53h429.82q32.74 0 56.26 23.53 23.53 23.52 23.53 56.26v549.82q0 32.51-23.53 55.87-23.52 23.35-56.26 23.35H314.7Zm0-79.22h429.82v-549.82H314.7v549.82ZM175.48-55.69q-32.74 0-56.26-23.53-23.53-23.52-23.53-56.26v-589.43q0-16.71 11.51-28.16 11.5-11.45 28.56-11.45 17.07 0 28.39 11.45 11.33 11.45 11.33 28.16v589.43h469.43q16.71 0 28.16 11.5 11.45 11.51 11.45 28.57 0 17.06-11.45 28.39-11.45 11.33-28.16 11.33H175.48ZM314.7-274.7v-549.82 549.82Z"></path>
          </svg>
        </button>
        {showTooltip === 'copy' && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-10">
            Wert kopieren
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>

      {/* Copy Variable Button */}
      <div
        className="relative"
        onMouseEnter={() => setShowTooltip('variable')}
        onMouseLeave={() => setShowTooltip(null)}
      >
        <button
          className="p-0 hover:opacity-70 transition-opacity cursor-pointer color-primary"
          tabIndex={-1}
          type="button"
          onClick={handleCopyVariable}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 -960 960 960"
            aria-label="data_object"
            fill="currentColor"
          >
            <path d="M618.09-145.87q-16.91 0-28.26-11.5-11.35-11.5-11.35-28.42t11.07-27.83q11.07-10.9 28.54-10.9h61.74q23.51 0 39.58-16.09 16.07-16.08 16.07-40.13v-87q0-37.29 22.5-67.28Q780.48-465 816.61-476v-8q-36.13-10-58.63-40.48-22.5-30.49-22.5-67.78v-87.57q0-23.51-16.07-39.58-16.07-16.07-39.58-16.07h-61.74q-16.91 0-28.26-11.5-11.35-11.5-11.35-28.42t11.07-28.11q11.07-11.19 28.54-11.19h75.87q50.59 0 85.66 35.48 35.08 35.47 35.08 85.83v87q0 24.05 15.8 40.13 15.8 16.09 39.85 16.09 9.95 0 17.15 6.93 7.2 6.94 7.2 16.92v92.37q0 10.54-7.2 17.33-7.2 6.79-17.15 6.79-24.05 0-39.85 16.08-15.8 16.07-15.8 39.58v87.56q0 50.36-35.08 85.55-35.07 35.19-85.66 35.19h-75.87Zm-352.05 0q-50.59 0-85.38-35.19-34.79-35.19-34.79-85.55v-87.56q0-23.51-16.07-39.58-16.07-16.08-39.58-16.08-10.76 0-17.56-6.81-6.79-6.82-6.79-17.61v-91.8q0-10.78 6.79-17.45 6.8-6.67 17.56-6.67 23.51 0 39.58-16.09 16.07-16.08 16.07-40.13v-87q0-50.36 34.79-85.83 34.79-35.48 85.38-35.48h75.87q16.34 0 27.69 11.79 11.36 11.78 11.36 28.7t-11.07 27.83q-11.07 10.9-27.98 10.9h-61.17q-24.05 0-40.13 16.07-16.09 16.07-16.09 39.58v87.57q0 37.38-22.53 67.94-22.52 30.56-58.03 40.32v8.27q35.51 10.68 58.03 40.55 22.53 29.88 22.53 67.44v87q0 24.05 16.09 40.13 16.08 16.09 40.13 16.09h61.17q16.34 0 27.69 11.5 11.36 11.5 11.36 28.42t-11.07 27.83q-11.07 10.9-27.98 10.9h-75.87Z"></path>
          </svg>
        </button>
        {showTooltip === 'variable' && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-10">
            Variable kopieren
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    </div>
  );
};
