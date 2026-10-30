"use client";

// Öğrenci silme ikon düğmesi: tarayıcı onay penceresinde "Vazgeç" seçilirse form gönderilmez.
import { Icon } from "@/components/Icon";

export default function DeleteStudentButton({ name }: { name: string }) {
  return (
    <button
      className="btn-icon-danger"
      title="Sil"
      aria-label={`${name} öğrencisini sil`}
      onClick={(e) => {
        if (!window.confirm(`"${name}" kalıcı olarak silinsin mi? Öğrencinin giriş-çıkış geçmişi ve WhatsApp kayıtları da silinir; bu işlem geri alınamaz.`)) e.preventDefault();
      }}
    >
      <Icon name="trash" className="h-[18px] w-[18px]" />
    </button>
  );
}
