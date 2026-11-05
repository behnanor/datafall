import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { pick6, type L6 } from "@/lib/bossVariants";

// v1.04 save safety: shown when a save file exists but could not be read. Autosave stays off while this is
// open, so the real save is never overwritten by a fresh game.
const TEXT = {
  title: ["Your save could not be read", "Kaydın okunamadı", "Não foi possível ler seu save", "No se pudo leer tu partida", "Не удалось прочитать сохранение", "无法读取你的存档"],
  body: [
    "Your progress was not touched and the game is not saving right now. The file may be locked by another program (e.g. antivirus or cloud sync) or damaged. Close that program and press Retry.",
    "İlerlemene dokunulmadı ve oyun şu an kayıt yapmıyor. Dosya başka bir program (ör. antivirüs veya bulut eşitleme) tarafından kilitlenmiş ya da bozulmuş olabilir. O programı kapatıp Tekrar dene'ye bas.",
    "Seu progresso não foi alterado e o jogo não está salvando agora. O arquivo pode estar bloqueado por outro programa (ex.: antivírus ou sincronização na nuvem) ou danificado. Feche esse programa e clique em Tentar de novo.",
    "Tu progreso no se ha tocado y el juego no está guardando ahora. Puede que otro programa (p. ej. antivirus o sincronización en la nube) bloquee el archivo o que esté dañado. Cierra ese programa y pulsa Reintentar.",
    "Ваш прогресс не тронут, и игра сейчас не сохраняет. Файл может быть заблокирован другой программой (например, антивирусом или облачной синхронизацией) или повреждён. Закройте эту программу и нажмите «Повторить».",
    "你的进度未被改动，游戏目前不会保存。文件可能被其他程序（如杀毒软件或云同步）锁定或已损坏。关闭该程序后点击“重试”。",
  ],
  retry: ["Retry", "Tekrar dene", "Tentar de novo", "Reintentar", "Повторить", "重试"],
  folder: ["Open save folder", "Kayıt klasörünü aç", "Abrir pasta do save", "Abrir carpeta de partidas", "Открыть папку сохранений", "打开存档文件夹"],
  skip: ["Continue without this file", "Bu dosya olmadan devam et", "Continuar sem este arquivo", "Continuar sin este archivo", "Продолжить без этого файла", "不使用此文件继续"],
  skipConfirm: [
    "The unreadable file is moved to the backups folder (not deleted). The game then loads your newest local copy, or starts a new game if there is none. Continue?",
    "Okunamayan dosya yedekler klasörüne taşınır (silinmez). Oyun sonra en yeni yerel kopyanı yükler, yoksa yeni oyun başlar. Devam edilsin mi?",
    "O arquivo ilegível é movido para a pasta de backups (não é apagado). O jogo carrega sua cópia local mais recente ou começa um novo jogo se não houver. Continuar?",
    "El archivo ilegible se mueve a la carpeta de copias (no se borra). El juego cargará tu copia local más reciente o empezará una nueva partida si no hay. ¿Continuar?",
    "Нечитаемый файл будет перемещён в папку резервных копий (не удалён). Затем игра загрузит самую новую локальную копию или начнёт новую игру. Продолжить?",
    "无法读取的文件将移到备份文件夹（不会删除）。之后游戏会加载最新的本地副本，若没有则开始新游戏。继续吗？",
  ],
  confirm: ["Yes, continue", "Evet, devam et", "Sim, continuar", "Sí, continuar", "Да, продолжить", "是，继续"],
  cancel: ["Back", "Geri", "Voltar", "Volver", "Назад", "返回"],
  failed: ["The file could not be moved. Try again or open the save folder.", "Dosya taşınamadı. Tekrar dene veya kayıt klasörünü aç.", "Não foi possível mover o arquivo. Tente de novo ou abra a pasta do save.", "No se pudo mover el archivo. Reintenta o abre la carpeta de partidas.", "Не удалось переместить файл. Повторите или откройте папку сохранений.", "无法移动该文件。请重试或打开存档文件夹。"],
} satisfies Record<string, L6>;

export function SaveLoadErrorScreen({
  language,
  reason,
  onRetry,
  onOpenFolder,
  onContinueWithout,
}: {
  language: Language;
  reason: string;
  onRetry: () => void;
  onOpenFolder: () => void;
  onContinueWithout: () => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const continueWithout = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await onContinueWithout();
    setBusy(false);
    if (!ok) {
      setFailed(true);
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm" data-testid="save-load-error">
      <div className="w-[min(560px,92vw)] rounded-xl border border-amber-500/50 bg-slate-950/95 p-6 text-center shadow-2xl">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-amber-300/80">DataFall · Save</p>
        <h2 className="mt-2 text-2xl font-bold text-amber-100">{pick6(language, TEXT.title)}</h2>
        <p className="mt-3 text-sm text-slate-300">{pick6(language, confirming ? TEXT.skipConfirm : TEXT.body)}</p>
        {!confirming && <p className="mt-2 font-mono text-[11px] text-slate-500">{reason}</p>}
        {failed && <p className="mt-2 text-sm text-red-300">{pick6(language, TEXT.failed)}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {confirming ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => setConfirming(false)} data-testid="save-error-cancel">{pick6(language, TEXT.cancel)}</Button>
              <Button disabled={busy} onClick={() => void continueWithout()} data-testid="save-error-confirm-skip">{pick6(language, TEXT.confirm)}</Button>
            </>
          ) : (
            <>
              <Button onClick={onRetry} data-testid="save-error-retry">{pick6(language, TEXT.retry)}</Button>
              <Button variant="outline" onClick={onOpenFolder} data-testid="save-error-open-folder">{pick6(language, TEXT.folder)}</Button>
              <Button variant="ghost" onClick={() => setConfirming(true)} data-testid="save-error-skip">{pick6(language, TEXT.skip)}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
