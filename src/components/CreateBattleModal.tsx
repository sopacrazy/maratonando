import React, { useState, useEffect, useRef } from 'react';
import { TMDBService, TMDBSeries } from '../services/tmdbService';

interface CreateBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (battleData: {
    topic: string;
    description: string;
    durationHours: number;
    isPublic: boolean;
    series: TMDBSeries;
  }) => void;
}

const CreateBattleModal: React.FC<CreateBattleModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [durationHours, setDurationHours] = useState(0.0028); // Default 10 segundos para testes (10/3600 = 0.0028 horas)
  const [isPublic, setIsPublic] = useState(true);
  const [seriesQuery, setSeriesQuery] = useState('');
  const [seriesResults, setSeriesResults] = useState<TMDBSeries[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<TMDBSeries | null>(null);
  const [showSeriesDropdown, setShowSeriesDropdown] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const seriesInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Buscar séries quando o usuário digita
  useEffect(() => {
    if (seriesQuery.length > 2) {
      const timer = setTimeout(async () => {
        setLoadingSeries(true);
        try {
          const results = await TMDBService.searchSeries(seriesQuery);
          setSeriesResults(results.slice(0, 10)); // Limitar a 10 resultados
          setShowSeriesDropdown(true);
        } catch (error) {
          console.error('Erro ao buscar séries:', error);
          setSeriesResults([]);
        } finally {
          setLoadingSeries(false);
        }
      }, 300); // Debounce de 300ms

      return () => clearTimeout(timer);
    } else {
      setSeriesResults([]);
      setShowSeriesDropdown(false);
    }
  }, [seriesQuery]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        seriesInputRef.current &&
        !seriesInputRef.current.contains(event.target as Node)
      ) {
        setShowSeriesDropdown(false);
      }
    };

    if (showSeriesDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSeriesDropdown]);

  // Resetar formulário ao fechar
  useEffect(() => {
    if (!isOpen) {
      setTopic('');
      setDescription('');
      setDurationHours(24);
      setIsPublic(true);
      setSeriesQuery('');
      setSelectedSeries(null);
      setSeriesResults([]);
      setShowSeriesDropdown(false);
    }
  }, [isOpen]);

  const handleSelectSeries = (series: TMDBSeries) => {
    setSelectedSeries(series);
    setSeriesQuery(series.name);
    setShowSeriesDropdown(false);
  };

  const handleRemoveSeries = () => {
    setSelectedSeries(null);
    setSeriesQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      alert('Por favor, preencha o título da batalha.');
      return;
    }

    if (!description.trim()) {
      alert('Por favor, preencha a descrição da batalha.');
      return;
    }

    if (!selectedSeries) {
      alert('Por favor, selecione uma série relacionada.');
      return;
    }

    // Para testes: permitir 10 segundos (0.0028 horas) até 48 horas
    if (durationHours < 0.0028 || durationHours > 48) {
      alert('A duração deve ser entre 10 segundos e 48 horas (máximo 2 dias).');
      return;
    }

    onCreate({
      topic: topic.trim(),
      description: description.trim(),
      durationHours,
      isPublic,
      series: selectedSeries,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-amber-200 dark:border-amber-800">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-surface-dark border-b border-amber-200 dark:border-amber-800 p-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">swords</span>
            Criar Batalha de Opiniões
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white transition-colors p-1"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
              Título da Batalha *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: O Final de Lost foi muito ruim"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              maxLength={200}
            />
            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
              {topic.length}/200 caracteres
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
              Descrição *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva melhor o tema da batalha..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none min-h-[100px]"
              rows={4}
              maxLength={500}
              required
            />
            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
              {description.length}/500 caracteres
            </p>
          </div>

          {/* Duração */}
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
              Duração da Batalha *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={durationHours}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value >= 0.0028 && value <= 48) {
                    setDurationHours(value);
                  }
                }}
                min={0.0028}
                max={48}
                step={0.0028}
                className="w-24 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <span className="text-sm text-slate-600 dark:text-text-secondary">
                horas (máximo 48 horas = 2 dias)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
              {durationHours < 1 ? (
                <>A batalha ficará ativa por {Math.round(durationHours * 3600)} segundos (para testes)</>
              ) : (
                <>A batalha ficará ativa por {durationHours} {durationHours === 1 ? 'hora' : 'horas'}</>
              )}
            </p>
          </div>

          {/* Visibilidade */}
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
              Visibilidade *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Público
                  </span>
                  <p className="text-xs text-slate-500 dark:text-text-secondary">
                    Qualquer pessoa pode participar
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Somente Seguidores
                  </span>
                  <p className="text-xs text-slate-500 dark:text-text-secondary">
                    Apenas seus seguidores podem participar
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Seleção de Série */}
          <div className="relative">
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
              Série Relacionada *
            </label>
            {selectedSeries ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                {selectedSeries.poster_path && (
                  <img
                    src={TMDBService.getImageUrl(selectedSeries.poster_path)}
                    alt={selectedSeries.name}
                    className="w-12 h-16 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedSeries.name}
                  </p>
                  {selectedSeries.first_air_date && (
                    <p className="text-xs text-slate-500 dark:text-text-secondary">
                      {new Date(selectedSeries.first_air_date).getFullYear()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSeries}
                  className="text-slate-500 dark:text-text-secondary hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={seriesInputRef}
                  type="text"
                  value={seriesQuery}
                  onChange={(e) => setSeriesQuery(e.target.value)}
                  placeholder="Digite o nome da série..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                {loadingSeries && (
                  <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
                    Buscando séries...
                  </p>
                )}
                {showSeriesDropdown && seriesResults.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-10 w-full bottom-full mb-1 bg-white dark:bg-surface-dark border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                  >
                    {seriesResults.map((series) => (
                      <button
                        key={series.id}
                        type="button"
                        onClick={() => handleSelectSeries(series)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left"
                      >
                        {series.poster_path ? (
                          <img
                            src={TMDBService.getImageUrl(series.poster_path)}
                            alt={series.name}
                            className="w-10 h-14 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-14 rounded bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400 text-sm">tv</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {series.name}
                          </p>
                          {series.first_air_date && (
                            <p className="text-xs text-slate-500 dark:text-text-secondary">
                              {new Date(series.first_air_date).getFullYear()}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              Criar Batalha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBattleModal;

