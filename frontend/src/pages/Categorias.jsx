import { useState } from 'react';
import { Plus, Pencil, Trash2, Wind } from 'lucide-react';
import { useCrud } from '../hooks/useCrud.js';
import { useListView } from '../hooks/useListView.js';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ListToolbar from '../components/ListToolbar.jsx';
import Pagination from '../components/Pagination.jsx';

const EMPTY = { nome: '', descricao: '', valorDiaria: '', tipoCarroceria: 'Sedan', propulsao: 'Combustão', cambio: 'Automático', arCondicionado: true, capacidade: 5 };

export default function Categorias() {
  const { data, loading, refetch } = useCrud('/categoriasdeveiculos');
  const list = useListView(data, r => `${r.nome} ${r.tipoCarroceria} ${r.propulsao} ${r.cambio}`);
  const toast = useToast();
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
    setForm({ nome: row.nome, descricao: row.descricao || '', valorDiaria: row.valorDiaria, tipoCarroceria: row.tipoCarroceria, propulsao: row.propulsao, cambio: row.cambio, arCondicionado: row.arCondicionado, capacidade: row.capacidade });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, valorDiaria: parseFloat(form.valorDiaria), capacidade: parseInt(form.capacidade), arCondicionado: Boolean(form.arCondicionado) };
      if (editing) { await api.put(`/categoriasdeveiculos/${editing}`, body); toast('Categoria atualizada.'); }
      else { await api.post('/categoriasdeveiculos', body); toast('Categoria criada.'); }
      setModal(false); refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setDelLoading(true);
    try { await api.delete(`/categoriasdeveiculos/${delId}`); toast('Categoria removida.'); setDelId(null); refetch(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setDelLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Categorias de veículo</h1>
        <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Nova categoria</button>
      </div>

      {data.length > 0 && (
        <ListToolbar query={list.query} onQuery={list.setQuery} placeholder="Buscar por nome, tipo ou propulsão…" total={list.paginacao.total} />
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6B7280' }}>Carregando…</div>
        ) : data.length === 0 ? (
          <EmptyState message="Nenhuma categoria cadastrada." action={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Nova categoria</button>} />
        ) : list.isEmpty ? (
          <EmptyState message={`Nenhuma categoria encontrada para “${list.query}”.`} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Nome</th>
                  <th className="th">Tipo</th>
                  <th className="th">Propulsão</th>
                  <th className="th">Câmbio</th>
                  <th className="th-r">Capacidade</th>
                  <th className="th">AR</th>
                  <th className="th-r">Diária</th>
                  <th className="th" style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map(row => (
                  <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                    <td className="td font-medium">{row.nome}</td>
                    <td className="td">{row.tipoCarroceria}</td>
                    <td className="td">{row.propulsao}</td>
                    <td className="td">{row.cambio}</td>
                    <td className="td-r">{row.capacidade}</td>
                    <td className="td">
                      {row.arCondicionado
                        ? <Wind className="h-4 w-4" style={{ color: '#16A34A' }} />
                        : <span style={{ color: '#6B7280' }}>—</span>}
                    </td>
                    <td className="td-r">R$ {parseFloat(row.valorDiaria).toFixed(2)}</td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="btn-ghost p-1.5" onClick={() => openEdit(row)}><Pencil className="h-3.5 w-3.5" /></button>
                        <button className="btn-ghost p-1.5" onClick={() => setDelId(row.id)}><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
                      </div>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar categoria' : 'Nova categoria'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="field-label">Nome</label>
            <input className="field-input" value={form.nome} onChange={F('nome')} maxLength={50} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Tipo de carroceria</label>
              <select className="field-select" value={form.tipoCarroceria} onChange={F('tipoCarroceria')}>
                {['Sedan','Hatch','SUV','Picape'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Propulsão</label>
              <select className="field-select" value={form.propulsao} onChange={F('propulsao')}>
                {['Elétrico','Híbrido','Combustão'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Câmbio</label>
              <select className="field-select" value={form.cambio} onChange={F('cambio')}>
                <option>Automático</option><option>Manual</option>
              </select>
            </div>
            <div>
              <label className="field-label">Capacidade (passageiros)</label>
              <input className="field-input" type="number" min="1" value={form.capacidade} onChange={F('capacidade')} />
            </div>
            <div>
              <label className="field-label">Valor da diária (R$)</label>
              <input className="field-input" type="number" min="0" step="0.01" value={form.valorDiaria} onChange={F('valorDiaria')} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                id="arCond"
                type="checkbox"
                checked={!!form.arCondicionado}
                onChange={e => setForm(p => ({ ...p, arCondicionado: e.target.checked }))}
                className="h-4 w-4 rounded"
                style={{ accentColor: '#1B4FCE' }}
              />
              <label htmlFor="arCond" className="text-sm" style={{ color: '#374151' }}>Ar-condicionado</label>
            </div>
          </div>
          <div>
            <label className="field-label">Descrição <span style={{ color: '#6B7280' }}>(opcional)</span></label>
            <textarea className="field-textarea" value={form.descricao} onChange={F('descricao')} maxLength={1000} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar categoria'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} loading={delLoading} title="Remover categoria" message="Esta categoria será removida permanentemente. Confirma?" />
    </div>
  );
}
