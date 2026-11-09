import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { z } from 'zod';
import {
  editableFields,
  flavorRecordSchema,
  flavorSchema,
} from '../../shared/flavor.js';
type Flavor = z.infer<typeof flavorRecordSchema>;
import { useParams, useNavigate } from 'react-router-dom';

function FlavorEditor() {
  const { id } = useParams();
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchFlavor = async () => {
      setError(null);
      setFlavor(null);
      try {
        const response = await fetch(`/api/flavor/${id}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'Вкус не найден.'
              : 'Не удалось загрузить карточку.',
          );
        const data = flavorRecordSchema.parse(await response.json());
        if (!controller.signal.aborted) setFlavor(data);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить карточку.',
          );
      }
    };
    void fetchFlavor();
    return () => controller.abort();
  }, [id, attempt]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setSaved(false);
    const { name, value } = e.target;

    if (name.startsWith('flavor_profile')) {
      const key = name.split('_')[2];
      setFlavor(
        (prev) =>
          prev && {
            ...prev,
            flavor_profile: {
              ...prev.flavor_profile,
              [key]: value === '' ? null : Number(value),
            },
          },
      );
    } else if (name.startsWith('aromatic_notes')) {
      const key = name.split('_')[2];
      setFlavor(
        (prev) =>
          prev && {
            ...prev,
            aromatic_notes: {
              ...prev.aromatic_notes,
              [key]: value,
            },
          },
      );
    } else {
      setFlavor(
        (prev) =>
          prev && {
            ...prev,
            [name]:
              name === 'flavor_intensity'
                ? value === ''
                  ? null
                  : Number(value)
                : value,
          },
      );
    }
  };

  const handleSave = async () => {
    if (!flavor || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const update = flavorSchema.parse(
        Object.fromEntries(
          editableFields.map((field) => [field, flavor[field]]),
        ),
      );
      const response = await fetch(`/api/flavor/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!response.ok)
        throw new Error(
          'Не удалось сохранить карточку. Проверьте данные и повторите.',
        );
      setFlavor(flavorRecordSchema.parse(await response.json()));
      setSaved(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Не удалось сохранить карточку.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!flavor)
    return (
      <div className="flavor-editor">
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <button onClick={() => setAttempt((value) => value + 1)}>
              Повторить
            </button>
          </div>
        ) : (
          <p role="status">Загрузка...</p>
        )}
        <button onClick={handleBack}>К каталогу</button>
      </div>
    );

  return (
    <div className="flavor-editor">
      <h3>Редактирование вкуса</h3>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Данные сохранены</p>}
      <fieldset disabled={saving} aria-label="Параметры вкуса">
        <div className="input-group">
          <label>ID:</label>
          <input type="text" value={flavor.id} readOnly />
        </div>
        <div className="input-group">
          <label>Бренд:</label>
          <input type="text" value={flavor.brand} readOnly />
        </div>
        <div className="input-group">
          <label>Наименование табака:</label>
          <input type="text" value={flavor.name} readOnly />
        </div>
        <div className="input-group">
          <label>Описание:</label>
          <textarea
            name="description"
            value={flavor.description || ''}
            onChange={handleChange}
            placeholder="Введите описание вкуса..."
            title="Описание вкуса. Например: 'Свежий, сладкий вкус с легкой кислинкой'."
          />
        </div>
        <div className="input-group">
          <label>Тэги:</label>
          <textarea
            name="tags"
            value={flavor.tags || ''}
            onChange={handleChange}
            placeholder="Введите тэги через запятую, например: фруктовый, сладкий"
            title="Добавьте тэги, чтобы описать вкус (через запятую)."
          />
        </div>
        <div className="input-group">
          <label>Интенсивность вкуса (1-10):</label>
          <input
            type="range"
            name="flavor_intensity"
            min="1"
            max="10"
            value={flavor.flavor_intensity || ''}
            onChange={handleChange}
            title="Настройте интенсивность вкуса от 1 (слабый) до 10 (сильный)."
          />
          <span>{flavor.flavor_intensity}</span>
        </div>
        <div className="input-group">
          <label>Вкусовой профиль:</label>
          <div>
            <label>Сладкий (1-5):</label>
            <input
              type="number"
              name="flavor_profile_sweet"
              min="1"
              max="5"
              value={flavor.flavor_profile?.sweet || ''}
              onChange={handleChange}
              title="Укажите степень сладости вкуса."
            />
          </div>
          <div>
            <label>Кислый (1-5):</label>
            <input
              type="number"
              name="flavor_profile_sour"
              min="1"
              max="5"
              value={flavor.flavor_profile?.sour || ''}
              onChange={handleChange}
              title="Укажите степень кислотности вкуса."
            />
          </div>
          <div>
            <label>Терпкий (1-5):</label>
            <input
              type="number"
              name="flavor_profile_tart"
              min="1"
              max="5"
              value={flavor.flavor_profile?.tart || ''}
              onChange={handleChange}
              title="Укажите степень терпкости вкуса."
            />
          </div>
          <div>
            <label>Умами (1-5):</label>
            <input
              type="number"
              name="flavor_profile_umami"
              min="1"
              max="5"
              value={flavor.flavor_profile?.umami || ''}
              onChange={handleChange}
              title="Укажите степень вкуса умами."
            />
          </div>
        </div>
        <div className="input-group">
          <label>Ароматические ноты:</label>
          <input
            type="text"
            name="aromatic_notes_top"
            value={flavor.aromatic_notes?.top || ''}
            onChange={handleChange}
            placeholder="Верхние ноты, например: цитрусовые, травянистые"
            title="Опишите верхние ароматические ноты."
          />
          <input
            type="text"
            name="aromatic_notes_middle"
            value={flavor.aromatic_notes?.middle || ''}
            onChange={handleChange}
            placeholder="Средние ноты, например: цветочные, пряные"
            title="Опишите средние ароматические ноты."
          />
          <input
            type="text"
            name="aromatic_notes_base"
            value={flavor.aromatic_notes?.base || ''}
            onChange={handleChange}
            placeholder="Базовые ноты, например: древесные, мускусные"
            title="Опишите базовые ароматические ноты."
          />
        </div>
        <div className="input-group">
          <label>Тип вкуса:</label>
          <input
            type="text"
            name="flavor_type"
            value={flavor.flavor_type || ''}
            onChange={handleChange}
            placeholder="Категория, например: фрукты, десерты, специи"
            title="Опишите тип вкуса."
          />
        </div>
        <div className="input-group">
          <label>Доминирующий вкус:</label>
          <select
            name="dominant_flavor"
            value={flavor.dominant_flavor || ''}
            onChange={handleChange}
            title="Выберите доминирующий вкус."
          >
            <option value="">Выберите...</option>
            <option value="акцент">Акцент</option>
            <option value="основной">Основной</option>
          </select>
        </div>
        <div className="input-group">
          <label>Временная динамика:</label>
          <select
            name="temporal_dynamics"
            value={flavor.temporal_dynamics || ''}
            onChange={handleChange}
            title="Опишите временную динамику вкуса."
          >
            <option value="">Выберите...</option>
            <option value="быстро выгорает">Быстро выгорает</option>
            <option value="раскрывается постепенно">
              Раскрывается постепенно
            </option>
            <option value="стабилен весь сеанс">Стабилен весь сеанс</option>
          </select>
        </div>
        <div className="input-group">
          <label>Крепость:</label>
          <select
            name="strength"
            value={flavor.strength || ''}
            onChange={handleChange}
            title="Выберите крепость вкуса."
          >
            <option value="">Выберите крепость...</option>
            <option value="легкий">Легкий</option>
            <option value="средний">Средний</option>
            <option value="крепкий">Крепкий</option>
          </select>
        </div>
        <div className="input-group">
          <label>Сезонность:</label>
          <select
            name="seasonality"
            value={flavor.seasonality || ''}
            onChange={handleChange}
            title="Опишите сезонность вкуса."
          >
            <option value="">Выберите сезон...</option>
            <option value="лето">Лето</option>
            <option value="осень">Осень</option>
            <option value="зима">Зима</option>
            <option value="весна">Весна</option>
            <option value="межсезон">Межсезон</option>
          </select>
        </div>
        <div className="input-group">
          <label>Культурные ассоциации:</label>
          <input
            type="text"
            name="cultural_associations"
            value={flavor.cultural_associations || ''}
            onChange={handleChange}
            placeholder="Ассоциации с культурой или традициями"
            title="Опишите культурные ассоциации вкуса."
          />
        </div>
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button onClick={handleBack}>Назад</button>
      </fieldset>
    </div>
  );
}

export default FlavorEditor;
