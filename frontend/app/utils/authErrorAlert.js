function firstNonEmptyString(values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function extractBackendMessage(error) {
  const data = error?.data;
  if (!data) {
    return null;
  }

  if (typeof data === 'string') {
    return data.trim() || null;
  }

  const direct = firstNonEmptyString([data?.message, data?.error, data?.title, data?.detail]);
  if (direct) {
    return direct;
  }

  const errors = data?.errors;
  if (Array.isArray(errors)) {
    return firstNonEmptyString(errors);
  }

  if (errors && typeof errors === 'object') {
    for (const value of Object.values(errors)) {
      if (Array.isArray(value)) {
        const nested = firstNonEmptyString(value);
        if (nested) {
          return nested;
        }
      }
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

function isRussianText(value) {
  return typeof value === 'string' && /[А-Яа-яЁё]/.test(value);
}

function statusCode(error) {
  if (typeof error?.status === 'number') {
    return error.status;
  }
  if (typeof error?.originalStatus === 'number') {
    return error.originalStatus;
  }
  return null;
}

export function buildAuthErrorAlert(error, mode = 'login') {
  const backendMessage = extractBackendMessage(error);
  const status = statusCode(error);
  const statusRaw = error?.status;
  const transportError = typeof error?.error === 'string' ? error.error : '';

  if (
    statusRaw === 'FETCH_ERROR' ||
    statusRaw === 'TIMEOUT_ERROR' ||
    /network|failed|timeout|abort/i.test(transportError)
  ) {
    return {
      title: 'Проблема с сетью',
      message: 'Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.',
    };
  }

  if (mode === 'login') {
    if (status === 400 || status === 401 || status === 403 || status === 422 || status === 503) {
      return {
        title: 'Не удалось войти',
        message: 'Неверные данные.',
      };
    }
    if (status != null && status >= 500) {
      return {
        title: 'Не удалось войти',
        message: 'Сервер временно недоступен. Попробуйте позже.',
      };
    }
    return {
      title: 'Не удалось войти',
      message: isRussianText(backendMessage) ? backendMessage : 'Неверные данные.',
    };
  }

  if (status === 409) {
    return {
      title: 'Регистрация отклонена',
      message: isRussianText(backendMessage) ? backendMessage : 'Пользователь с таким email уже существует.',
    };
  }
  if (status === 400 || status === 401 || status === 403 || status === 422 || status === 503) {
    return {
      title: 'Не удалось зарегистрироваться',
      message: 'Неверные данные.',
    };
  }
  if (status != null && status >= 500) {
    return {
      title: 'Не удалось зарегистрироваться',
      message: 'Сервер временно недоступен. Попробуйте позже.',
    };
  }

  return {
    title: 'Не удалось зарегистрироваться',
    message: isRussianText(backendMessage) ? backendMessage : 'Не удалось выполнить запрос. Попробуйте снова.',
  };
}
