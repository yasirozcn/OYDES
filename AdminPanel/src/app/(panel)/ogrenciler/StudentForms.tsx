"use client";

// "Yeni öğrenci ekle" formu (en fazla iki veli) ve CSV ile toplu ekleme: sonucu (hata/başarı) formun altında gösterir, başarıda formu temizler.
import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { createStudentAction, importStudentsAction } from "../actions";

// Şablonda yalnızca başlık satırı var; "﻿" Excel'in Türkçe karakterleri doğru açması için (UTF-8 işareti).
const CSV_TEMPLATE = "﻿okul_no;ad;soyad;sinif;telefon;eposta;veli1_ad;veli1_telefon;veli2_ad;veli2_telefon\r\n";
const PHONE_PLACEHOLDER = "0532 123 45 67";

function Result({ error, ok }: { error?: string; ok?: string | false }) {
  if (error) return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold whitespace-pre-line text-red-800 md:col-span-2">{error}</p>;
  if (ok) return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 md:col-span-2">{ok}</p>;
  return null;
}

export function AddStudentForm() {
  const [state, action, pending] = useActionState(createStudentAction, {});
  const [secondGuardian, setSecondGuardian] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-bold text-slate-600">{label}</span>
      <input name={name} className="input" {...props} />
    </label>
  );
  return (
    <form ref={ref} action={action} className="grid gap-4 md:grid-cols-2">
      {field("schoolNo", "Okul no *", { required: true })}
      {field("className", "Sınıf *", { required: true, placeholder: "9-A" })}
      {field("firstName", "Ad *", { required: true })}
      {field("lastName", "Soyad *", { required: true })}
      {field("phone", "Telefon *", { required: true, type: "tel", placeholder: PHONE_PLACEHOLDER })}
      {field("email", "E-posta", { type: "email" })}
      {field("guardian1Name", "Veli adı")}
      {field("guardian1Phone", "Veli telefonu", { type: "tel", placeholder: PHONE_PLACEHOLDER })}
      {secondGuardian && (
        <>
          {field("guardian2Name", "2. veli adı")}
          {field("guardian2Phone", "2. veli telefonu", { type: "tel", placeholder: PHONE_PLACEHOLDER })}
        </>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 md:col-span-2">
        {secondGuardian ? (
          <span />
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setSecondGuardian(true)}>
            <Icon name="plus" />
            İkinci veli ekle
          </button>
        )}
        <button className="btn btn-primary" disabled={pending}>
          <Icon name="userPlus" />
          {pending ? "Kaydediliyor…" : "Öğrenci ekle"}
        </button>
      </div>
      <Result error={state.error} ok={state.ok && "Öğrenci eklendi. Öğrenci uygulamada bu telefon numarasıyla giriş yapıp şifresini oluşturabilir."} />
    </form>
  );
}

export function ImportStudentsForm() {
  const [state, action, pending] = useActionState(importStudentsAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-1 flex-col gap-5">
      <p className="text-sm leading-relaxed text-slate-600">
        Şablonu indirip Excel&apos;de doldurun ve <b>CSV UTF-8</b> olarak kaydedin. Zorunlu sütunlar: okul_no, ad, soyad, sinif, telefon. Her öğrenciye en fazla iki veli (veli1, veli2) yazılabilir; telefonu yazılan her veliye WhatsApp mesajı gider. Dosyada tek bir hata bile varsa hiçbir öğrenci eklenmez.
      </p>
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          aria-label="CSV dosyası"
          className="block w-full cursor-pointer text-[13px] text-slate-500 file:mr-4 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-slate-900 hover:file:bg-slate-100"
        />
      </div>
      <Result error={state.error} ok={state.ok && `${state.count} öğrenci eklendi.`} />
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <a className="flex items-center gap-1.5 text-[13px] font-bold text-brand-700 hover:text-brand-800" href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`} download="ogrenci-sablonu.csv">
          <Icon name="download" />
          Şablonu indir
        </a>
        <button className="btn btn-secondary" disabled={pending}>
          <Icon name="upload" />
          {pending ? "Yükleniyor…" : "CSV yükle"}
        </button>
      </div>
    </form>
  );
}
