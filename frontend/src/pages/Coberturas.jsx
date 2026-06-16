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

const EMPTY = { nome: '', descricao: '', valorIndenizacaoMax: '' };

export default function Coberturas() {
  const { data, loading, refetch } = useCrud('/coberturas');
  const list = useListView(data, r => `${r.nome} ${r.descricao ?? ''}`);
  const toast = useToast();
  const { user } = useAuth();
  const podeEditar = user?.cargo === 'Gerente'; // Atendente vê, mas não edita coberturas
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (row) => {
    setEditing(row.id);
    setForm({ nome: row.nome, descricao: row.descricao || '', valorIndenizacaoMax: row.valorIndenizacaoMax });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { nome: form.nome, descricao: form.descricao, valorIndenizacaoMax: parseFloat(form.valorIndenizacaoMax) };
      if (editing) { await api.put(`/coberturas/${editing}`, body); toast('Cobertura atualizada.'); }
      else { await api.post('/coberturas', body); toast('Cobertura criada.'); }
      setModal(false);
      refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setDelLoading(true);
    try { await api.delete(`/coberturas/${delId}`); toast('Cobertura removida.'); setDelId(null); refetch(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setDelLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Coberturas</h1>
        {podeEditar && (
          <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Nova cobertura</button>
        )}
      </div>

      {data.length > 0 && (
        <ListToolbar query={list.query} onQuery={list.setQuery} placeholder="Buscar por nome ou descrição…" total={list.paginacao.total} />
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6B7280' }}>Carregando…</div>
        ) : data.length === 0 ? (
          <EmptyState message="Nenhuma cobertura cadastrada." action={podeEditar ? <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Nova cobertura</button> : undefined} />
        ) : list.isEmpty ? (
          <EmptyState message={`Nenhuma cobertura encontrada para “${list.query}”.`} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Nome</th>
                  <th className="th-r">Indenização máxima</th>
                  <th className="th">Descrição</th>
                  <th className="th" style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map(row => (
                  <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                    <td className="td font-medium">{row.nome}</td>
                    <td className="td-r">R$ {parseFloat(row.valorIndenizacaoMax).toFixed(2)}</td>
                    <td className="td" style={{ color: '#6B7280', maxWidth: 280 }}>
                      <span className="line-clamp-1">{row.descricao || '—'}</span>
                    </td>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar cobertura' : 'Nova cobertura'}>
        <div className="space-y-4">
          <div>
            <label className="field-label">Nome</label>
            <input className="field-input" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} maxLength={50} />
          </div>
          <div>
            <label className="field-label">Valor máximo de indenização (R$)</label>
            <input className="field-input" type="number" min="0" step="0.01" value={form.valorIndenizacaoMax} onChange={e => setForm(p => ({ ...p, valorIndenizacaoMax: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Descrição <span style={{ color: '#6B7280' }}>(opcional)</span></label>
            <textarea className="field-textarea" value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} maxLength={1000} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar cobertura'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} loading={delLoading} title="Remover cobertura" message="Esta cobertura será removida permanentemente. Confirma?" />
    </div>
  );
}
