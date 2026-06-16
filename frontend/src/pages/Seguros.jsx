import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useCrud } from '../hooks/useCrud.js';
import { useListView } from '../hooks/useListView.js';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ListToolbar from '../components/ListToolbar.jsx';
import Pagination from '../components/Pagination.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const EMPTY = { nome: '', empresaSeguradora: '', descricao: '', valorDiariaAdicional: '', franquia: '', coberturaIds: [] };

export default function Seguros() {
  const { data, loading, refetch } = useCrud('/seguros');
  const { data: coberturas } = useCrud('/coberturas');
  const list = useListView(data, r => `${r.nome} ${r.empresaSeguradora}`);
  const toast = useToast();
  const { user } = useAuth();
  const podeEditar = user?.cargo === 'Gerente'; // Atendente vê, mas não edita seguros
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const F = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (row) => {
    setEditing(row.id);
    setForm({ nome: row.nome, empresaSeguradora: row.empresaSeguradora, descricao: row.descricao || '', valorDiariaAdicional: row.valorDiariaAdicional, franquia: row.franquia, coberturaIds: (row.coberturas || []).map(c => c.id) });
    setModal(true);
  };

  const toggleCobertura = (id) => {
    setForm(p => ({
      ...p,
      coberturaIds: p.coberturaIds.includes(id) ? p.coberturaIds.filter(x => x !== id) : [...p.coberturaIds, id],
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { nome: form.nome, empresaSeguradora: form.empresaSeguradora, descricao: form.descricao, valorDiariaAdicional: parseFloat(form.valorDiariaAdicional), franquia: parseFloat(form.franquia), coberturaIds: form.coberturaIds };
      if (editing) { await api.put(`/seguros/${editing}`, body); toast('Seguro atualizado.'); }
      else { await api.post('/seguros', body); toast('Seguro criado.'); }
      setModal(false); refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setDelLoading(true);
    try { await api.delete(`/seguros/${delId}`); toast('Seguro removido.'); setDelId(null); refetch(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setDelLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Seguros</h1>
        {podeEditar && (
          <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Novo seguro</button>
        )}
      </div>

      {data.length > 0 && (
        <ListToolbar query={list.query} onQuery={list.setQuery} placeholder="Buscar por plano ou seguradora…" total={list.paginacao.total} />
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6B7280' }}>Carregando…</div>
        ) : data.length === 0 ? (
          <EmptyState message="Nenhum seguro cadastrado." action={podeEditar ? <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Novo seguro</button> : undefined} />
        ) : list.isEmpty ? (
          <EmptyState message={`Nenhum seguro encontrado para “${list.query}”.`} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Nome / Seguradora</th>
                  <th className="th-r">Diária adicional</th>
                  <th className="th-r">Franquia</th>
                  <th className="th-r">Coberturas</th>
                  <th className="th" style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map(row => (
                  <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                    <td className="td">
                      <div className="font-medium">{row.nome}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{row.empresaSeguradora}</div>
                    </td>
                    <td className="td-r">R$ {parseFloat(row.valorDiariaAdicional).toFixed(2)}</td>
                    <td className="td-r">R$ {parseFloat(row.franquia).toFixed(2)}</td>
                    <td className="td-r">{(row.coberturas || []).length}</td>
                    <td className="td">
                      {podeEditar && (
                        <div className="flex items-center gap-1 justify-end">
                          <button className="btn-ghost p-1.5" onClick={() => openEdit(row)}><Pencil className="h-3.5 w-3.5" /></button>
                          <button className="btn-ghost p-1.5" onClick={() => setDelId(row.id)}><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination paginacao={list.paginacao} onChange={list.setPage} />
          </>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar seguro' : 'Novo seguro'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nome do plano</label>
              <input className="field-input" value={form.nome} onChange={F('nome')} maxLength={50} />
            </div>
            <div>
              <label className="field-label">Empresa seguradora</label>
              <input className="field-input" value={form.empresaSeguradora} onChange={F('empresaSeguradora')} maxLength={50} />
            </div>
            <div>
              <label className="field-label">Diária adicional (R$)</label>
              <input className="field-input" type="number" min="0" step="0.01" value={form.valorDiariaAdicional} onChange={F('valorDiariaAdicional')} />
            </div>
            <div>
              <label className="field-label">Franquia (R$)</label>
              <input className="field-input" type="number" min="0" step="0.01" value={form.franquia} onChange={F('franquia')} />
            </div>
          </div>
          <div>
            <label className="field-label">Descrição <span style={{ color: '#6B7280' }}>(opcional)</span></label>
            <textarea className="field-textarea" value={form.descricao} onChange={F('descricao')} maxLength={1000} />
          </div>
          {coberturas.length > 0 && (
            <div>
              <label className="field-label">Coberturas incluídas</label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto" style={{ borderColor: '#E7E5E4' }}>
                {coberturas.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.coberturaIds.includes(c.id)}
                      onChange={() => toggleCobertura(c.id)}
                      className="h-4 w-4 rounded"
                      style={{ accentColor: '#D97706' }}
                    />
                    <span className="text-sm" style={{ color: '#374151' }}>{c.nome}</span>
                    <span className="text-xs ml-auto" style={{ color: '#6B7280' }}>máx R$ {parseFloat(c.valorIndenizacaoMax).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar seguro'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} loading={delLoading} title="Remover seguro" message="Este seguro será removido permanentemente. Confirma?" />
    </div>
  );
}
