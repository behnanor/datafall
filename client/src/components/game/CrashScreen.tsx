import { Component, type ErrorInfo, type ReactNode } from 'react';
import { canOpenLogsFolder, logRendererError, openLogsFolder } from '@/lib/errorLog';

// v1.04: a render error used to unmount the whole app and leave a black window.
// This boundary logs the error and offers a reload (the game loads the last autosave on start).
// It sits outside the i18n provider (that provider could be what failed), so it reads the language itself.

type Lang = 'en' | 'tr' | 'pt-BR' | 'es' | 'ru' | 'zh-CN';

const TEXT: Record<Lang, { title: string; body: string; reload: string; logs: string }> = {
  en: {
    title: 'Something went wrong',
    body: 'DataFall hit an unexpected error. Reload to continue from your last autosave. If this keeps happening, please send us the log file.',
    reload: 'Reload game',
    logs: 'Open log folder',
  },
  tr: {
    title: 'Bir şeyler ters gitti',
    body: 'DataFall beklenmeyen bir hatayla karşılaştı. Son otomatik kayıttan devam etmek için yeniden yükle. Tekrar olursa lütfen log dosyasını bize gönder.',
    reload: 'Oyunu yeniden yükle',
    logs: 'Log klasörünü aç',
  },
  'pt-BR': {
    title: 'Algo deu errado',
    body: 'O DataFall encontrou um erro inesperado. Recarregue para continuar do último salvamento automático. Se continuar acontecendo, envie-nos o arquivo de log.',
    reload: 'Recarregar jogo',
    logs: 'Abrir pasta de logs',
  },
  es: {
    title: 'Algo salió mal',
    body: 'DataFall encontró un error inesperado. Recarga para continuar desde el último guardado automático. Si sigue pasando, envíanos el archivo de registro.',
    reload: 'Recargar juego',
    logs: 'Abrir carpeta de registros',
  },
  ru: {
    title: 'Что-то пошло не так',
    body: 'В DataFall произошла непредвиденная ошибка. Перезагрузите игру, чтобы продолжить с последнего автосохранения. Если это повторяется, пришлите нам файл лога.',
    reload: 'Перезагрузить игру',
    logs: 'Открыть папку логов',
  },
  'zh-CN': {
    title: '出现了问题',
    body: 'DataFall 遇到了意外错误。重新加载即可从最近的自动存档继续。如果反复出现，请把日志文件发给我们。',
    reload: '重新加载游戏',
    logs: '打开日志文件夹',
  },
};

function currentLang(): Lang {
  try {
    const stored = localStorage.getItem('datafall-language');
    if (stored && stored in TEXT) return stored as Lang;
  } catch {
    // ignore
  }
  return 'en';
}

interface State {
  error: Error | null;
}

export class CrashScreen extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logRendererError('react render', error, info.componentStack ?? undefined);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const text = TEXT[currentLang()];
    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#e2e8f0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          padding: 24,
          zIndex: 2147483647,
        }}
      >
        <div style={{ maxWidth: 520, border: '1px solid rgba(34,211,238,0.4)', borderRadius: 12, padding: 28, background: 'rgba(2,6,23,0.9)' }}>
          <h1 style={{ color: '#22d3ee', fontSize: 22, margin: '0 0 12px' }}>{text.title}</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 20px', color: '#cbd5e1' }}>{text.body}</p>
          <p style={{ fontSize: 11, margin: '0 0 20px', color: '#64748b', wordBreak: 'break-word' }}>{String(this.state.error.message).slice(0, 300)}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: 'pointer' }}
            >
              {text.reload}
            </button>
            {canOpenLogsFolder() && (
              <button
                type="button"
                onClick={openLogsFolder}
                style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: 'pointer' }}
              >
                {text.logs}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
