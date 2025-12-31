import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { AppContext } from '../App';
import { AdminService } from '../services/adminService';
import { TMDBService } from '../services/tmdbService';
import { Stamp, TMDBSeries } from '../types';

const AdminPanel: React.FC = () => {
    const { user } = useContext(AppContext);
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form States
    const [stampName, setStampName] = useState('');
    const [stampDesc, setStampDesc] = useState('');
    const [stampRarity, setStampRarity] = useState<'Comum' | 'Raro' | 'Épico' | 'Lendário'>('Comum');
    const [stampImage, setStampImage] = useState<File | null>(null);
    const [isPurchasable, setIsPurchasable] = useState(false);
    const [stampPrice, setStampPrice] = useState<number>(0);
    const [maxSupply, setMaxSupply] = useState<number | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Series Search State
    const [seriesQuery, setSeriesQuery] = useState('');
    const [seriesResults, setSeriesResults] = useState<TMDBSeries[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<{ id: number; title: string } | null>(null);
    const [searchingSeries, setSearchingSeries] = useState(false);

    // Logic State
    const [reqType, setReqType] = useState<string>('none');
    const [reqValue, setReqValue] = useState<number>(1);

    const [creating, setCreating] = useState(false);

    const [editingStampId, setEditingStampId] = useState<string | null>(null);

    // List States
    const [stamps, setStamps] = useState<Stamp[]>([]);

    useEffect(() => {
        checkAdmin();
        loadStamps();
    }, [user]);

    const checkAdmin = async () => {
        if (!user) return;
        const admin = await AdminService.isAdmin(user.id || '');
        if (!admin) {
            alert('Acesso negado. Área restrita a administradores.');
            navigate('/feed');
        }
        setIsAdmin(admin);
        setLoading(false);
    };

    const loadStamps = async () => {
        try {
            const data = await AdminService.getAllStamps();
            setStamps(data as Stamp[]);
        } catch (error) {
            console.error(error);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setStampImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleEdit = (stamp: Stamp) => {
        setEditingStampId(stamp.id);
        setStampName(stamp.name);
        setStampDesc(stamp.description);
        setStampRarity(stamp.rarity || 'Comum');
        setIsPurchasable(stamp.purchasable || false);
        setStampPrice(stamp.price || 0);
        setMaxSupply(stamp.max_supply || null);
        setReqType(stamp.req_type || 'none');
        setReqValue(stamp.req_value || 1);
        
        if (stamp.tmdb_id && stamp.series_title) {
            setSelectedSeries({ id: stamp.tmdb_id, title: stamp.series_title });
        } else {
            setSelectedSeries(null);
        }

        setImagePreview(stamp.image_url);
        
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingStampId(null);
        setStampName('');
        setStampDesc('');
        setStampRarity('Comum');
        setStampImage(null);
        setIsPurchasable(false);
        setStampPrice(0);
        setImagePreview(null);
        setSelectedSeries(null);
        setSeriesQuery('');
        setReqType('none');
        setReqValue(1);
        setMaxSupply(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stampName || !stampDesc) return;
        // Check image only if creating
        if (!editingStampId && !stampImage) {
            alert('Selecione uma imagem para o selo');
            return;
        }

        setCreating(true);
        try {
            if (editingStampId) {
                await AdminService.updateStamp(
                    editingStampId,
                    {
                        name: stampName,
                        description: stampDesc,
                        rarity: stampRarity,
                        isPurchasable,
                        price: stampPrice,
                        tmdbId: selectedSeries?.id,
                        seriesTitle: selectedSeries?.title,
                        reqType,
                        reqValue,
                        maxSupply
                    },
                    stampImage // Optional new image
                );
                alert('Selo atualizado com sucesso!');
                handleCancelEdit(); // Reset form
            } else {
                await AdminService.createStamp(
                    stampName,
                    stampDesc,
                    stampRarity,
                    stampImage!, // Checked above
                    isPurchasable,
                    stampPrice,
                    selectedSeries?.id,
                    selectedSeries?.title,
                    reqType,
                    reqValue,
                    maxSupply
                );
                alert('Selo criado com sucesso!');
                handleCancelEdit(); // Use same reset logic
            }
            loadStamps();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar selo.');
        } finally {
            setCreating(false);
        }
    };

    const handleSeriesSearch = async (query: string) => {
        setSeriesQuery(query);
        if (query.length > 2) {
            setSearchingSeries(true);
            try {
                const results = await TMDBService.searchSeries(query);
                setSeriesResults(results);
            } catch (error) {
                console.error(error);
            } finally {
                setSearchingSeries(false);
            }
        } else {
            setSeriesResults([]);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir o selo "${name}"?`)) {
            try {
                await AdminService.deleteStamp(id);
                setStamps(prev => prev.filter(s => s.id !== id));
                if (editingStampId === id) handleCancelEdit();
            } catch (error) {
                console.error(error);
                alert('Erro ao excluir selo.');
            }
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-[#1a1122] flex items-center justify-center">Carregando...</div>;

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1a1122]">
            <Navigation page="settings" />

            <main className="max-w-4xl mx-auto p-4 md:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Painel do Administrador</h1>
                    <p className="text-slate-500 dark:text-text-secondary">Gerencie selos, usuários e configurações do sistema.</p>
                </div>

                <div className="flex flex-col gap-8">
                    {/* Create/Edit Stamp Section */}
                    <div className={`bg-white dark:bg-surface-dark p-6 rounded-xl shadow-sm border ${editingStampId ? 'border-primary' : 'border-gray-200 dark:border-white/5'} w-full transition-colors`}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className={`material-symbols-outlined ${editingStampId ? 'text-primary' : 'text-slate-500'}`}>
                                    {editingStampId ? 'edit' : 'add_circle'}
                                </span>
                                {editingStampId ? 'Editar Selo' : 'Criar Novo Selo'}
                            </h2>
                            {editingStampId && (
                                <button 
                                    onClick={handleCancelEdit}
                                    className="text-sm text-red-500 font-bold hover:underline"
                                >
                                    Cancelar Edição
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Live Preview (Left Side) - SAME AS BEFORE */}
                            <div className="w-full lg:w-72 shrink-0 flex flex-col items-center">
                                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2 w-full text-center">Pré-visualização</label>

                                {/* Card Preview */}
                                <div className="relative group cursor-pointer w-64">
                                    <div className={`aspect-square w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all bg-gray-50 dark:bg-black/20 ${imagePreview ? 'border-primary' : 'border-gray-300 dark:border-gray-600 hover:border-primary'}`}>
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">add_photo_alternate</span>
                                                <p className="text-xs text-gray-400 font-medium">Clique para adicionar imagem</p>
                                                <p className="text-[10px] text-gray-400 mt-1">(Quadrada 1:1)</p>
                                            </div>
                                        )}

                                        {/* Rarity Tag Preview */}
                                        <div className={`absolute top-3 right-3 px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm tracking-wider ${stampRarity === 'Lendário' ? 'bg-yellow-500 text-white' :
                                                stampRarity === 'Épico' ? 'bg-purple-600 text-white' :
                                                    stampRarity === 'Raro' ? 'bg-blue-500 text-white' :
                                                        'bg-slate-500 text-white'
                                            }`}>
                                            {stampRarity}
                                        </div>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    {/* Overlay Helper for Click */}
                                    <div className="absolute inset-0 bg-transparent" onClick={(e) => {
                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                        input.click();
                                    }}></div>
                                </div>

                                {/* Text Preview */}
                                <div className="mt-3 text-center w-full">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">{stampName || 'Nome do Selo'}</h3>
                                    {selectedSeries && (
                                        <p className="text-xs text-primary font-medium truncate">{selectedSeries.title}</p>
                                    )}
                                    {isPurchasable && (
                                        <span className="mt-1 text-sm font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                                            {stampPrice} 🪙
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                         {/* REST OF FORM */}
                            <form onSubmit={handleSubmit} className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                {/* ... form fields ... */}
                                {/* Keeping existing form structure but replacing handleSubmit button text */}
                                
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-white/5 pb-2">Informações Básicas</h3>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Nome do Selo</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 text-sm"
                                        placeholder="Ex: Maratonista"
                                        value={stampName}
                                        onChange={e => setStampName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Raridade</label>
                                    <select
                                        className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 text-sm"
                                        value={stampRarity}
                                        onChange={e => setStampRarity(e.target.value as any)}
                                    >
                                        <option value="Comum">Comum</option>
                                        <option value="Raro">Raro</option>
                                        <option value="Épico">Épico</option>
                                        <option value="Lendário">Lendário</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Descrição / Comando (Tooltip)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 text-sm"
                                        placeholder="Ex: Assistir 10 horas de séries..."
                                        value={stampDesc}
                                        onChange={e => setStampDesc(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2 mt-2">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-white/5 pb-2 pt-2">Regras e Economia</h3>
                                </div>

                                {/* Series Search - Unchanged */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Série Relacionada (Opcional)</label>
                                    <div className="relative">
                                        {selectedSeries ? (
                                            <div className="flex items-center justify-between p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                                                <span className="font-bold text-primary truncate max-w-[200px]">{selectedSeries.title}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSeries(null)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 text-sm"
                                                    placeholder="Buscar série..."
                                                    value={seriesQuery}
                                                    onChange={e => handleSeriesSearch(e.target.value)}
                                                />
                                                {seriesResults.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                                        {seriesResults.map(series => (
                                                            <div
                                                                key={series.id}
                                                                className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-2 border-b border-gray-100 dark:border-white/5 last:border-0"
                                                                onClick={() => {
                                                                    setSelectedSeries({ id: series.id, title: series.name });
                                                                    setSeriesQuery('');
                                                                    setSeriesResults([]);
                                                                }}
                                                            >
                                                                {series.poster_path && (
                                                                    <img src={`https://image.tmdb.org/t/p/w92${series.poster_path}`} alt={series.name} className="w-8 h-12 object-cover rounded" />
                                                                )}
                                                                <span className="text-sm font-bold text-slate-700 dark:text-gray-300 truncate">{series.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Quantidade (Estoque)</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 text-sm"
                                        placeholder="Ilimitado"
                                        value={maxSupply || ''}
                                        onChange={e => setMaxSupply(e.target.value ? Number(e.target.value) : null)}
                                    />
                                </div>

                                {/* Automation Logic - Unchanged */}
                                {selectedSeries && (
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                        <div className="md:col-span-2">
                                            <label className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-bold mb-2">
                                                <span className="material-symbols-outlined">auto_awesome</span>
                                                Automação de Conquista
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Critério</label>
                                            <select
                                                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2 text-sm"
                                                value={reqType}
                                                onChange={e => setReqType(e.target.value)}
                                            >
                                                <option value="none">Manual</option>
                                                <option value="post_count">Posts sobre a série</option>
                                            </select>
                                        </div>
                                        {reqType === 'post_count' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Quantidade</label>
                                                <input
                                                    type="number"
                                                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2 text-sm"
                                                    value={reqValue}
                                                    onChange={e => setReqValue(Number(e.target.value))}
                                                    min="1"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Price / Store - Unchanged */}
                                <div className="md:col-span-2 flex flex-col md:flex-row md:items-center gap-4 border-t border-gray-100 dark:border-white/5 pt-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                                            <input
                                                type="checkbox"
                                                id="purchasable"
                                                className="peer absolute opacity-0 w-0 h-0"
                                                checked={isPurchasable}
                                                onChange={(e) => setIsPurchasable(e.target.checked)}
                                            />
                                            <label htmlFor="purchasable" className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${isPurchasable ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}></label>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${isPurchasable ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                        </div>
                                        <label htmlFor="purchasable" className="text-sm font-bold text-slate-700 dark:text-gray-300 cursor-pointer">
                                            Vender na Loja?
                                        </label>
                                    </div>

                                    {isPurchasable && (
                                        <div className="flex-1 max-w-[200px] animate-in slide-in-from-left-2 duration-200">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 pl-9 text-sm"
                                                    placeholder="Preço"
                                                    value={stampPrice}
                                                    onChange={e => setStampPrice(Number(e.target.value))}
                                                    min="0"
                                                />
                                                <span className="absolute left-3 top-2.5">🪙</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="ml-auto bg-primary text-white font-bold py-2.5 px-8 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/30"
                                    >
                                        {creating ? 'Processando...' : (editingStampId ? 'Salvar Edição' : 'Criar Selo')}
                                    </button>
                                </div>

                            </form>
                        </div>
                    </div>

                    {/* Existing Stamps Grid */}
                    <div className="bg-white dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-gray-200 dark:border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-yellow-500">military_tech</span>
                                Selos Existentes ({stamps.length})
                            </h2>
                        </div>

                        {stamps.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {stamps.map(stamp => (
                                    <div key={stamp.id} className="group relative bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl p-4 flex flex-col items-center hover:border-primary/50 transition-colors">
                                        <div className="w-full aspect-square bg-gray-200 dark:bg-white/5 rounded-lg mb-3 overflow-hidden relative">
                                            <img src={stamp.image_url} alt={stamp.name} className="w-full h-full object-cover" />
                                            {/* Rarity Badge inside card */}
                                            <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${stamp.rarity === 'Lendário' ? 'bg-yellow-500 text-white' :
                                                    stamp.rarity === 'Épico' ? 'bg-purple-600 text-white' :
                                                        stamp.rarity === 'Raro' ? 'bg-blue-500 text-white' :
                                                            'bg-slate-500 text-white'
                                                }`}>
                                                {stamp.rarity}
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 text-center truncate w-full">{stamp.name}</h3>
                                        {stamp.series_title && (
                                            <p className="text-xs text-primary mb-2 truncate w-full text-center">{stamp.series_title}</p>
                                        )}

                                        <div className="flex items-center justify-center gap-2 mt-auto w-full pt-2 border-t border-gray-100 dark:border-white/5">
                                            {stamp.purchasable ? (
                                                <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                                                    {stamp.price} 🪙
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400">Exclusivo</span>
                                            )}
                                        </div>

                                        {/* Supply Info */}
                                        {stamp.max_supply && (
                                            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[8px] font-mono">
                                                {stamp.current_supply}/{stamp.max_supply}
                                            </div>
                                        )}

                                        {/* Action Buttons Overlay */}
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl gap-2">
                                            {/* Edit Button */}
                                            <button
                                                onClick={() => handleEdit(stamp)}
                                                className="bg-blue-500 text-white p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleDelete(stamp.id, stamp.name)}
                                                className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                                                title="Excluir"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 dark:bg-black/20 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">sentiment_dissatisfied</span>
                                <p className="text-slate-500">Nenhum selo encontrado.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPanel;
