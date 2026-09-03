import { useRef, useState } from "react";
import { Button } from "./Button";
import { useI18n } from "../../state/LanguageContext";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";

/**
 * A file-picker for a single attachment (PDF, Word document or image),
 * stored as a data-URI alongside its original filename — same "no object
 * storage in this deployment" convention as ImagePicker/Item.photoUrl. Used
 * for the invoice / bon de commande a supplier sends back on a purchase
 * order.
 */
export function FilePicker({
  fileName,
  fileUrl,
  onSelect,
  onClear,
}: {
  fileName: string | null;
  fileUrl: string | null;
  onSelect: (fileName: string, fileUrl: string) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(t("field.fileTooLarge"));
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onSelect(file.name, reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="image-picker">
      {fileUrl && fileName ? (
        <p className="field-hint" style={{ marginTop: 0 }}>
          <a href={fileUrl} download={fileName} target="_blank" rel="noreferrer">
            {fileName}
          </a>
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="image-picker-input"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          {fileUrl ? t("field.changeFile") : t("field.chooseFile")}
        </Button>
        {fileUrl ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onClear();
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            {t("field.removeFile")}
          </Button>
        ) : null}
      </div>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
