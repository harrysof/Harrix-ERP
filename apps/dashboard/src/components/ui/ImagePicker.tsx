import { useRef, useState } from "react";
import { Button } from "./Button";
import { useI18n } from "../../state/LanguageContext";

const MAX_BYTES = 3 * 1024 * 1024;

/**
 * A file-picker for a single image, stored as a data-URI (see
 * Item.photoUrl's doc comment) — there is no object storage in this
 * deployment, so the picked file is embedded directly rather than uploaded
 * somewhere and linked. Used wherever a photo/logo field used to be a plain
 * URL text input (articles, fournisseurs, clients).
 */
export function ImagePicker({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("field.photoInvalidType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("field.photoTooLarge"));
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="image-picker">
      {value ? (
        <div className="field-photo-preview">
          <img src={value} alt="" />
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="image-picker-input"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          {value ? t("field.changePhoto") : t("field.choosePhoto")}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            {t("field.removePhoto")}
          </Button>
        ) : null}
      </div>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
