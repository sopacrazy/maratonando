import React, { useState, useContext } from "react";
import { ClubMember } from "../../services/clubService";
import { AppContext } from "../../App";
import { useError } from "../../context/ErrorContext";
import { ClubService } from "../../services/clubService";
import { useNavigate } from "react-router-dom";

interface ClubMembersProps {
  clubId: string;
  members: ClubMember[];
  userRole?: "admin" | "vice_leader" | "moderator" | "member";
  onMembersUpdate: () => void;
  showOnlyList?: boolean;
}

const ClubMembers: React.FC<ClubMembersProps> = ({
  clubId,
  members,
  userRole,
  onMembersUpdate,
  showOnlyList = false,
}) => {
  const { user } = useContext(AppContext);
  const { showError } = useError();
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState<ClubMember | null>(
    null
  );
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const isAdmin = userRole === "admin";
  const canModerate = ["admin", "moderator", "vice_leader"].includes(
    userRole || ""
  );

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Tem certeza que deseja expulsar este membro?")) return;

    try {
      await ClubService.removeMember(clubId, memberId);
      showError("Membro expulso", "success", 2000);
      onMembersUpdate();
    } catch (error: any) {
      showError(error.message || "Erro ao expulsar membro", "error");
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      await ClubService.updateMemberRole(
        clubId,
        memberId,
        newRole as "vice_leader" | "moderator" | "member"
      );
      showError("Cargo atualizado", "success", 2000);
      setShowRoleModal(false);
      setSelectedMember(null);
      onMembersUpdate();
    } catch (error: any) {
      showError(error.message || "Erro ao atualizar cargo", "error");
    }
  };

  const handleTransferLeadership = async () => {
    if (!selectedMember) return;
    if (
      !confirm(
        `Tem certeza que deseja passar a liderança para ${selectedMember.user?.name}? Você se tornará apenas um membro.`
      )
    )
      return;

    try {
      await ClubService.transferLeadership(clubId, selectedMember.user_id);
      showError("Liderança transferida", "success", 3000);
      setShowTransferModal(false);
      setSelectedMember(null);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      showError(error.message || "Erro ao transferir liderança", "error");
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Líder",
      vice_leader: "Vice-Líder",
      moderator: "Moderador",
      member: "Membro",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-500/10 text-red-600 dark:text-red-400",
      vice_leader: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      moderator: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      member: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    };
    return colors[role] || colors.member;
  };

  const onlineMembers = members.filter((m) => m.is_online);
  const offlineMembers = members.filter((m) => !m.is_online);

  if (showOnlyList) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-bold text-slate-900 dark:text-white">
            Membros ({members.length})
          </h3>
        </div>
        <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
          {/* Online */}
          {onlineMembers.length > 0 && (
            <>
              <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wider">
                Online ({onlineMembers.length})
              </p>
              {onlineMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                  onClick={() => navigate(`/user/${member.user_id}`)}
                >
                  <div className="relative">
                    <div
                      className="size-10 rounded-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${member.user?.avatar}')`,
                      }}
                    ></div>
                    <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-white dark:border-surface-dark"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {member.user?.name}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(
                        member.role
                      )}`}
                    >
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Offline */}
          {offlineMembers.length > 0 && (
            <>
              <p className="text-xs font-bold text-slate-500 dark:text-text-secondary mb-2 uppercase tracking-wider mt-4">
                Offline ({offlineMembers.length})
              </p>
              {offlineMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer opacity-60"
                  onClick={() => navigate(`/user/${member.user_id}`)}
                >
                  <div
                    className="size-10 rounded-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url('${member.user?.avatar}')`,
                    }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {member.user?.name}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(
                        member.role
                      )}`}
                    >
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-white/10">
        <h3 className="font-bold text-slate-900 dark:text-white">
          Membros ({members.length})
        </h3>
      </div>

      <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 group"
          >
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => navigate(`/user/${member.user_id}`)}
            >
              <div className="relative">
                <div
                  className="size-12 rounded-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${member.user?.avatar}')`,
                  }}
                ></div>
                {member.is_online && (
                  <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-white dark:border-surface-dark"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-white truncate">
                  {member.user?.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(
                      member.role
                    )}`}
                  >
                    {getRoleLabel(member.role)}
                  </span>
                  {member.is_online && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Online
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && member.user_id !== user?.id && (
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {member.role !== "admin" && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowRoleModal(true);
                      }}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Alterar cargo"
                    >
                      <span className="material-symbols-outlined text-lg">
                        badge
                      </span>
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Expulsar"
                    >
                      <span className="material-symbols-outlined text-lg">
                        person_remove
                      </span>
                    </button>
                  </>
                )}
                {member.role === "admin" && (
                  <button
                    onClick={() => {
                      setSelectedMember(member);
                      setShowTransferModal(true);
                    }}
                    className="p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                    title="Transferir liderança"
                  >
                    <span className="material-symbols-outlined text-lg">
                      swap_horiz
                    </span>
                  </button>
                )}
              </div>
            )}

            {canModerate &&
              !isAdmin &&
              member.user_id !== user?.id &&
              member.role === "member" && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Expulsar"
                >
                  <span className="material-symbols-outlined text-lg">
                    person_remove
                  </span>
                </button>
              )}
          </div>
        ))}
      </div>

      {/* Modal de Alterar Cargo */}
      {showRoleModal && selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setShowRoleModal(false);
            setSelectedMember(null);
          }}
        >
          <div
            className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-surface-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Alterar Cargo de {selectedMember.user?.name}
            </h3>
            <div className="space-y-2 mb-6">
              {["vice_leader", "moderator", "member"].map((role) => (
                <button
                  key={role}
                  onClick={() => handleUpdateRole(selectedMember.id, role)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    selectedMember.role === role
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 dark:border-white/10 hover:border-primary/50"
                  }`}
                >
                  <span className="font-bold text-slate-900 dark:text-white">
                    {getRoleLabel(role)}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowRoleModal(false);
                setSelectedMember(null);
              }}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-white/10 text-slate-700 dark:text-white font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Transferir Liderança */}
      {showTransferModal && selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setShowTransferModal(false);
            setSelectedMember(null);
          }}
        >
          <div
            className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-surface-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Transferir Liderança
            </h3>
            <p className="text-slate-600 dark:text-text-secondary mb-6">
              Você está prestes a passar a liderança para{" "}
              <strong>{selectedMember.user?.name}</strong>. Você se tornará
              apenas um membro.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedMember(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-white/10 text-slate-700 dark:text-white font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransferLeadership}
                className="flex-1 px-4 py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubMembers;

