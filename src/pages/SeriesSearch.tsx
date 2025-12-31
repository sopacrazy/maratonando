import React, { useState, useContext, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { AppContext } from '../App';
import { TMDBService, TMDBSeries } from '../services/tmdbService';
import { UserSeriesService } from '../services/userSeriesService';

const SeriesSearchPage: React.FC = () => {
    const { user } = useContext(AppContext);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TMDBSeries[]>([]);
    const [loading, setLoading] = useState(false);
    const [userSeriesIds, setUserSeriesIds] = useState<Set<number>>(new Set());

    // Load user series IDs to check if already added
    useEffect(() => {
        if (user?.id) {
            UserSeriesService.getUserSeries(user.id).then(series => {
                setUserSeriesIds(new Set(series.map(s => s.tmdb_id)));
            });
        }
    }, [user?.id]);

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (val.length > 2) {
            setLoading(true);
            try {
                const data = await TMDBService.searchSeries(val);
                // Limit to 50 results explicitly (though API usually returns fewer per page, we slice to be safe)
                setResults(data.slice(0, 50));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        } else {
            setResults([]);
        }
    };

    const handleAddSeries = async (series: TMDBSeries) => {
        if (!user?.id) return alert('Faça login para adicionar.');
        try {
            await UserSeriesService.addSeries(user.id, series);
            setUserSeriesIds(prev => new Set(prev).add(series.id));
            alert(`${series.name} adicionada!`);
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col transition-colors duration-300">
            <Navigation page="market" />

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                <header className="mb-8 text-center md:text-left">
                    <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Buscar Séries</h1>
                    <p className="text-slate-500 dark:text-text-secondary">Encontre suas séries favoritas para acompanhar.</p>
                </header>

                <div className="mb-8">
                    <div className="relative max-w-2xl mx-auto md:mx-0">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-gray-400">search</span>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-4 border border-gray-200 dark:border-border-dark rounded-xl leading-5 bg-white dark:bg-surface-dark placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-slate-900 dark:text-white shadow-sm transition-colors"
                            placeholder="Digite o nome da série..."
                            value={query}
                            onChange={handleSearch}
                            autoFocus
                        />
                        {loading && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                            </div>
                        )}
                    </div>
                </div>

                {results.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {results.map(series => (
                            <div key={series.id} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark overflow-hidden hover:shadow-md transition-shadow group relative">
                                <div className="aspect-[2/3] bg-gray-200 dark:bg-white/5 relative">
                                    {series.poster_path ? (
                                        <img
                                            src={TMDBService.getImageUrl(series.poster_path)}
                                            alt={series.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                                        </div>
                                    )}

                                    {/* Overlay Button */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                        <button
                                            onClick={() => handleAddSeries(series)}
                                            disabled={userSeriesIds.has(series.id)}
                                            className={`w-full py-2 rounded-lg font-bold text-sm shadow-lg transform transition-transform active:scale-95 ${userSeriesIds.has(series.id)
                                                    ? 'bg-green-500 text-white cursor-default'
                                                    : 'bg-primary text-white hover:bg-primary/90'
                                                }`}
                                        >
                                            {userSeriesIds.has(series.id) ? 'Adicionada' : 'Adicionar'}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight mb-1 truncate" title={series.name}>{series.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-text-secondary">{series.first_air_date ? series.first_air_date.split('-')[0] : 'N/A'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : query.length > 2 && !loading ? (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">search_off</span>
                        <p className="text-gray-500 dark:text-text-secondary">Nenhuma série encontrada para "{query}".</p>
                    </div>
                ) : null}

            </main>
        </div>
    );
};

export default SeriesSearchPage;
