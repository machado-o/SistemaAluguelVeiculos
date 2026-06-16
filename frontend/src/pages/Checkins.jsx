import { useState, useEffect } from 'react';
import { Plus, Trash2, Info, AlertTriangle, Pencil } from 'lucide-react';
import { useCrud } from '../hooks/useCrud.js';
import { useListView } from '../hooks/useListView.js';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ListToolbar from '../components/ListToolbar.jsx';
import Pagination from '../components/Pagination.jsx';

const EMPTY = { reservaId: '', funcionarioId: '', dataCheckin: '', cnhCondutor: '', cnhValidade: '', quilometragemCheckin: '', veiculoId: '' };

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function toInput(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Envia o horário local do input como ISO com fuso, para o servidor (UTC) gravar o instante correto.
function toISO(v) {
  if (!v) return v;
  const d = new Date(v);
  return isNaN(d) ? v : d.toISOString();
}

export default function Checkins() {
  const { data, loading, refetch } = useCrud('/checkins');
  const list = useListView(data, r => `#${r.id} #${r.reservaId} ${r.reserva?.cliente?.nome ?? ''} ${r.veiculo?.placa ?? ''} ${r.funcionario?.nome ?? ''}`);
  const { data: reservas } = useCrud('/reservas');
  const { data: funcionarios } = useCrud('/funcionarios');
  const { data: veiculos } = useCrud('/veiculos');
  const { data: multas } = useCrud('/multas');
  const toast = useToast();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [selectedReserva, setSelectedReserva] = useState(null);
  const [veiculosDisponiveis, setVeiculosDisponiveis] = useState([]);
  const [multasPendentes, setMultasPendentes] = useState([]);

  const pendentes = reservas.filter(r => r.status === 'Pendente');
  const F = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (!form.reservaId) { setSelectedReserva(null); setVeiculosDisponiveis([]); setMultasPendentes([]); return; }
    const r = reservas.find(x => x.id === parseInt(form.reservaId));
    setSelectedReserva(r || null);
    if (r) {
      const disponiveis = veiculos.filter(v => v.categoriaVeiculoId === r.categoriaVeiculoId && v.status === 'Disponível');
      setVeiculosDisponiveis(disponiveis);
      const pendentes = multas.filter(m => m.clienteId === r.clienteId && m.status === 'Pendente');
      setMultasPendentes(pendentes);
    }
  }, [form.reservaId, reservas, veiculos, multas]);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        reservaId: parseInt(form.reservaId),
        funcionarioId: parseInt(form.funcionarioId),
        dataCheckin: toISO(form.dataCheckin),
        cnhCondutor: form.cnhCondutor,
        cnhValidade: form.cnhValidade,
        quilometragemCheckin: parseFloat(form.quilometragemCheckin),
      };
      if (form.veiculoId) body.veiculoId = parseInt(form.veiculoId);
      const created = await api.post('/checkins', body);
      const assignedId = created?.veiculoId ?? created?.veiculo?.id;
      const assigned = veiculos.find(v => v.id === assignedId) || created?.veiculo;
      const placa = assigned?.placa;
      const foiUpgrade = assigned && selectedReserva && assigned.categoriaVeiculoId !== selectedReserva.categoriaVeiculoId;
      if (foiUpgrade) {
        toast(`Check-in realizado com upgrade automático: veículo ${placa} (categoria ${assigned.categoria?.nome ?? 'superior'}) atribuído.`);
      } else {
        toast(placa ? `Check-in realizado. Veículo ${placa} atribuído.` : 'Check-in realizado.');
      }
      setModal(false);
      refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setDelLoading(true);
    try { await api.delete(`/checkins/${delId}`); toast('Check-in removido.'); setDelId(null); refetch(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setDelLoading(false); }
  };

  const EF = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.value }));

  const openEdit = (row) => {
    setEditId(row.id);
    setEditForm({
      dataCheckin: toInput(row.dataCheckin),
      cnhCondutor: row.cnhCondutor || '',
      cnhValidade: row.cnhValidade?.split('T')[0] || row.cnhValidade || '',
      quilometragemCheckin: row.quilometragemCheckin ?? '',
      funcionarioId: String(row.funcionarioId ?? ''),
      veiculoId: String(row.veiculoId ?? ''),
    });
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      const body = {
        dataCheckin: toISO(editForm.dataCheckin),
        cnhCondutor: editForm.cnhCondutor,
        cnhValidade: editForm.cnhValidade,
        quilometragemCheckin: parseFloat(editForm.quilometragemCheckin),
        funcionarioId: parseInt(editForm.funcionarioId),
        veiculoId: parseInt(editForm.veiculoId),
      };
      await api.put(`/checkins/${editId}`, body);
      toast('Check-in atualizado.');
      setEditId(null);
      refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setEditSaving(false); }
  };

  // Para troca de veículo: disponíveis + o atualmente vinculado (que está como Reservado).
  const veiculosParaTroca = editForm
    ? veiculos.filter(v => v.status === 'Disponível' || v.id === parseInt(editForm.veiculoId))
    : [];

  const bloqueado = multasPendentes.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Check-in</h1>
        <button className="btn-primary" onClick={() => { setForm(EMPTY); setModal(true); }}>
          <Plus className="h-4 w-4" /> Novo check-in
        </button>
      </div>

      {data.length > 0 && (
        <ListToolbar query={list.query} onQuery={list.setQuery} placeholder="Buscar por cliente, placa ou reserva…" total={list.paginacao.total} />
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6B7280' }}>Carregando…</div>
        ) : data.length === 0 ? (
          <EmptyState message="Nenhum check-in registrado." action={<button className="btn-primary" onClick={() => { setForm(EMPTY); setModal(true); }}><Plus className="h-4 w-4" /> Novo check-in</button>} />
        ) : list.isEmpty ? (
          <EmptyState message={`Nenhum check-in encontrado para “${list.query}”.`} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">ID</th>
                  <th className="th">Reserva</th>
                  <th className="th">Cliente</th>
                  <th className="th">Veículo</th>
                  <th className="th">Funcionário</th>
                  <th className="th">Data check-in</th>
                  <th className="th-r">Km saída</th>
                  <th className="th" style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map(row => (
                  <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                    <td className="td-mono" style={{ color: '#6B7280' }}>#{row.id}</td>
                    <td className="td-mono" style={{ color: '#6B7280' }}>#{row.reservaId}</td>
                    <td className="td font-medium">{row.reserva?.cliente?.nome || '—'}</td>
                    <td className="td-mono font-semibold">{row.veiculo?.placa || '—'}</td>
                    <td className="td">{row.funcionario?.nome || '—'}</td>
                    <td className="td">{fmt(row.dataCheckin)}</td>
                    <td className="td-r">{parseFloat(row.quilometragemCheckin).toLocaleString('pt-BR')} km</td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        {!row.checkout && (
                          <button className="btn-ghost p-1.5" onClick={() => openEdit(row)} title="Editar check-in">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button className="btn-ghost p-1.5" onClick={() => setDelId(row.id)} title="Remover">
                          <Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} />
                        </button>
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

      <Modal open={modal} onClose={() => setModal(false)} title="Confirmar check-in" size="lg">
        <div className="space-y-4">
          <div>
            <label className="field-label">Reserva</label>
            <select className="field-select" value={form.reservaId} onChange={F('reservaId')}>
              <option value="">Selecione uma reserva pendente…</option>
              {pendentes.map(r => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {r.cliente?.nome || ''} — {r.categoriaVeiculo?.nome || ''}
                </option>
              ))}
            </select>
          </div>

          {bloqueado && (
            <div className="callout-warning">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Check-in bloqueado</p>
                <p>Este cliente possui {multasPendentes.length} multa(s) pendente(s). Regularize antes de realizar o check-in.</p>
              </div>
            </div>
          )}

          {selectedReserva && !bloqueado && (
            <div className="callout-info">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p><strong>CNH do cliente:</strong> <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedReserva.cliente?.cnh || '—'}</span></p>
                <p className="text-xs mt-0.5" style={{ color: '#1E40AF' }}>Confira se a CNH informada abaixo corresponde exatamente a este número.</p>
              </div>
            </div>
          )}

          {veiculosDisponiveis.length === 0 && selectedReserva && !bloqueado && (
            <div className="callout-amber">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Nenhum veículo disponível na categoria solicitada. O sistema realizará upgrade automático para a próxima categoria disponível.</span>
            </div>
          )}

          {veiculosDisponiveis.length > 0 && !bloqueado && (
            <div>
              <label className="field-label">Veículo</label>
              <select className="field-select" value={form.veiculoId} onChange={F('veiculoId')}>
                <option value="">Selecione o veículo…</option>
                {veiculosDisponiveis.map(v => (
                  <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo} ({v.cor})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="field-label">Funcionário responsável</label>
            <select className="field-select" value={form.funcionarioId} onChange={F('funcionarioId')}>
              <option value="">Selecione…</option>
              {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Data e hora do check-in</label>
              <input className="field-input" type="datetime-local" value={form.dataCheckin} onChange={F('dataCheckin')} />
            </div>
            <div>
              <label className="field-label">Quilometragem de saída</label>
              <input className="field-input" type="number" min="0" step="0.01" value={form.quilometragemCheckin} onChange={F('quilometragemCheckin')} />
            </div>
            <div>
              <label className="field-label">CNH do condutor</label>
              <input
                className="field-input"
                value={form.cnhCondutor}
                onChange={F('cnhCondutor')}
                maxLength={11}
                placeholder="11 dígitos"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <p className="field-hint">Deve ser idêntica à CNH cadastrada no cliente</p>
            </div>
            <div>
              <label className="field-label">Validade da CNH</label>
              <input className="field-input" type="date" value={form.cnhValidade} onChange={F('cnhValidade')} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving || bloqueado}>
              {saving ? 'Processando…' : 'Confirmar check-in'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title={`Editar check-in #${editId ?? ''}`} size="lg">
        {editForm && (
          <div className="space-y-4">
            <div className="callout-info">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>A reserva vinculada não muda. Trocar o veículo libera o anterior e reserva o novo.</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Data e hora do check-in</label>
                <input className="field-input" type="datetime-local" value={editForm.dataCheckin} onChange={EF('dataCheckin')} />
              </div>
              <div>
                <label className="field-label">Quilometragem de saída</label>
                <input className="field-input" type="number" min="0" step="0.01" value={editForm.quilometragemCheckin} onChange={EF('quilometragemCheckin')} />
              </div>
              <div>
                <label className="field-label">CNH do condutor</label>
                <input className="field-input" value={editForm.cnhCondutor} onChange={EF('cnhCondutor')} maxLength={11} style={{ fontFamily: "'JetBrains Mono', monospace" }} />
                <p className="field-hint">Deve ser idêntica à CNH do cliente da reserva</p>
              </div>
              <div>
                <label className="field-label">Validade da CNH</label>
                <input className="field-input" type="date" value={editForm.cnhValidade} onChange={EF('cnhValidade')} />
              </div>
              <div>
                <label className="field-label">Veículo</label>
                <select className="field-select" value={editForm.veiculoId} onChange={EF('veiculoId')}>
                  {veiculosParaTroca.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo} ({v.status})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Funcionário responsável</label>
                <select className="field-select" value={editForm.funcionarioId} onChange={EF('funcionarioId')}>
                  {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setEditId(null)} disabled={editSaving}>Cancelar</button>
              <button className="btn-primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Salvando…' : 'Salvar alterações'}</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} loading={delLoading} title="Remover check-in" message="Este check-in será removido permanentemente. Confirma?" />
    </div>
  );
}
