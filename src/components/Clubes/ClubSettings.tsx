import React, { useState } from "react";
import { Club, ClubMember } from "../../services/clubService";
import { ClubService } from "../../services/clubService";
import { useError } from "../../context/ErrorContext";
import { useNavigate } from "react-router-dom";
import LazyImage from "../LazyImage";

interface ClubSettingsProps {
  club: Club;
  onClose: () => void;
  onUpdate: () => void;
}

const ClubSettings: React.FC<ClubSettingsProps> = ({
  club,
  onClose,
  onUpdate,
}) => {
  const { showError } = useError();
  const navigate = useNavigate();

  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description || "");
  const [color, setColor] = useState(club.color);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    club.image_url || null
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ClubService.updateClub(club.id, {
        name,
        description,
        color,
        imageFile: imageFile || undefined,
      });
      showError("Clube atualizado com sucesso!", "success", 3000);
      onUpdate();
      onClose();
    } catch (error: any) {
      showError(error.message || "Erro ao atualizar clube", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClub = async () => {
    setDeleting(true);
    try {
      await ClubService.deleteClub(club.id);
      showError("Clube excluído com sucesso", "success", 3000);
      navigate("/clubes");
    } catch (error: any) {
      showError(error.message || "Erro ao excluir clube", "error");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-surface-border overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Configurações do Clube
              </h2>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Nome do Clube *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Cor do Clube
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-16 h-10 rounded border border-gray-300 dark:border-border-dark cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-primary"
                    placeholder="#6366f1"
                  />
                </div>
              </div>

              {/* Imagem */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Imagem do Clube
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-300 dark:border-border-dark">
                      <LazyImage
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <label className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-slate-700 dark:text-white font-bold rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                    <span className="material-symbols-outlined align-middle mr-2">
                      image
                    </span>
                    {imagePreview ? "Alterar Imagem" : "Escolher Imagem"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  {imagePreview && (
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      className="px-4 py-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-border-dark text-slate-700 dark:text-white font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>

              {/* Zona de Perigo */}
              <div className="pt-6 border-t border-red-200 dark:border-red-900/30">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">
                  Zona de Perigo
                </h3>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">delete</span>
                  Excluir Clube
                </button>
                <p className="text-xs text-slate-500 dark:text-text-secondary mt-2">
                  Esta ação não pode ser desfeita. Todos os posts, mensagens e
                  membros serão removidos permanentemente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full border border-red-200 dark:border-red-900/30 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
                warning
              </span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Excluir Clube?
              </h3>
              <p className="text-slate-600 dark:text-text-secondary">
                Tem certeza que deseja excluir{" "}
                <strong>{club.name}</strong>? Esta ação é irreversível e todos
                os dados serão perdidos.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-border-dark text-slate-700 dark:text-white font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteClub}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClubSettings;

