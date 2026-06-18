import { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Eye, Check, X, Pencil } from 'lucide-react';
import { useCrud } from '../hooks/useCrud.js';
import { useDetail } from '../hooks/useDetail.js';
import { useListView } from '../hooks/useListView.js';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ListToolbar from '../components/ListToolbar.jsx';
import Pagination from '../components/Pagination.jsx';
import { Section, Field, FieldGrid, money, km, dateTime, dateOnly } from '../components/Detail.jsx';

const EMPTY = {
  checkinId: '', funcionarioId: '', dataCheckout: '', quilometragemCheckout: '',
  nivelCombustivel: 'Alto', condicaoPneus: 'Bom', condicaoPalhetas: 'Boas',
  limpoInternamente: true, limpoExternamente: true, observacoes: '', avariaIds: [],
};

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Envia o horário local do input como ISO com fuso, para o servidor (UTC) gravar o instante correto.
function toISO(v) {
  if (!v) return v;
  const d = new Date(v);
  return isNaN(d) ? v : d.toISOString();
}

export default function Checkouts() {
  const { data, loading, refetch } = useCrud('/checkouts');
  const list = useListView(data, r => `#${r.id} #${r.checkinId} ${r.checkin?.veiculo?.placa ?? ''} ${r.funcionario?.nome ?? ''} ${r.nivelCombustivel}`);
  const { data: checkins } = useCrud('/checkins');
  const { data: funcionarios } = useCrud('/funcionarios');
  const { data: avarias } = useCrud('/avarias');
  const toast = useToast();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [kmError, setKmError] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const checkinsSemCheckout = checkins.filter(c => !c.checkout && c.reserva?.status === 'Confirmada');

  const F = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const FB = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.checked }));

  useEffect(() => {
    if (!form.checkinId) { setSelectedCheckin(null); return; }
    const c = checkins.find(x => x.id === parseInt(form.checkinId));
    setSelectedCheckin(c || null);
    setKmError('');
  }, [form.checkinId, checkins]);

  const validateKm = () => {
    if (!selectedCheckin || !form.quilometragemCheckout) return;
    if (parseFloat(form.quilometragemCheckout) <= parseFloat(selectedCheckin.quilometragemCheckin)) {
      setKmError(`Deve ser maior que ${parseFloat(selectedCheckin.quilometragemCheckin).toLocaleString('pt-BR')} km (quilometragem no check-in).`);
    } else {
      setKmError('');
    }
  };

  const toggleAvaria = (id) => {
    setForm(p => ({
      ...p,
      avariaIds: p.avariaIds.includes(id) ? p.avariaIds.filter(x => x !== id) : [...p.avariaIds, id],
    }));
  };

  const save = async () => {
    validateKm();
    if (kmError) return;
    setSaving(true);
    try {
      const body = {
        checkinId: parseInt(form.checkinId),
        funcionarioId: parseInt(form.funcionarioId),
        dataCheckout: toISO(form.dataCheckout),
        quilometragemCheckout: parseFloat(form.quilometragemCheckout),
        nivelCombustivel: form.nivelCombustivel,
        condicaoPneus: form.condicaoPneus,
        condicaoPalhetas: form.condicaoPalhetas,
        limpoInternamente: form.limpoInternamente,
        limpoExternamente: form.limpoExternamente,
        observacoes: form.observacoes,
        avariaIds: form.avariaIds,
      };
      await api.post('/checkouts', body);
      toast('Check-out concluído.');
      setModal(false);
      refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setDelLoading(true);
    try { await api.delete(`/checkouts/${delId}`); toast('Check-out removido.'); setDelId(null); refetch(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setDelLoading(false); }
  };

  const EF = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.value }));
  const EFB = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.checked }));

  const openEdit = (row) => {
    setEditId(row.id);
    setEditForm({
      placa: row.checkin?.veiculo?.placa || `check-in #${row.checkinId}`,
      quilometragemCheckout: row.quilometragemCheckout,
      avariasCount: (row.avarias || []).length,
      funcionarioId: String(row.funcionarioId ?? ''),
      nivelCombustivel: row.nivelCombustivel,
      condicaoPneus: row.condicaoPneus,
      condicaoPalhetas: row.condicaoPalhetas,
      limpoInternamente: row.limpoInternamente,
      limpoExternamente: row.limpoExternamente,
      observacoes: row.observacoes || '',
    });
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      const body = {
        funcionarioId: parseInt(editForm.funcionarioId),
        nivelCombustivel: editForm.nivelCombustivel,
        condicaoPneus: editForm.condicaoPneus,
        condicaoPalhetas: editForm.condicaoPalhetas,
        limpoInternamente: editForm.limpoInternamente,
        limpoExternamente: editForm.limpoExternamente,
        observacoes: editForm.observacoes,
      };
      await api.put(`/checkouts/${editId}`, body);
      toast('Check-out atualizado.');
      setEditId(null);
      refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setEditSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Check-out</h1>
        <button className="btn-primary" onClick={() => { setForm(EMPTY); setSelectedCheckin(null); setKmError(''); setModal(true); }}>
          <Plus className="h-4 w-4" /> Novo check-out
        </button>
      </div>

      {data.length > 0 && (
        <ListToolbar query={list.query} onQuery={list.setQuery} placeholder="Buscar por placa, funcionário ou check-in…" total={list.paginacao.total} />
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6B7280' }}>Carregando…</div>
        ) : data.length === 0 ? (
          <EmptyState message="Nenhum check-out registrado." action={<button className="btn-primary" onClick={() => { setForm(EMPTY); setModal(true); }}><Plus className="h-4 w-4" /> Novo check-out</button>} />
        ) : list.isEmpty ? (
          <EmptyState message={`Nenhum check-out encontrado para “${list.query}”.`} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">ID</th>
                  <th className="th">Check-in</th>
                  <th className="th">Placa</th>
                  <th className="th">Funcionário</th>
                  <th className="th">Data check-out</th>
                  <th className="th-r">Km devolução</th>
                  <th className="th">Combustível</th>
                  <th className="th-r">Avarias</th>
                  <th className="th-r">Taxa inspeção</th>
                  <th className="th" style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map(row => (
                  <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                    <td className="td-mono" style={{ color: '#6B7280' }}>#{row.id}</td>
                    <td className="td-mono" style={{ color: '#6B7280' }}>#{row.checkinId}</td>
                    <td className="td-mono font-semibold">{row.checkin?.veiculo?.placa || '—'}</td>
                    <td className="td">{row.funcionario?.nome || '—'}</td>
                    <td className="td">{fmt(row.dataCheckout)}</td>
                    <td className="td-r">{parseFloat(row.quilometragemCheckout).toLocaleString('pt-BR')} km</td>
                    <td className="td">{row.nivelCombustivel}</td>
                    <td className="td-r">{(row.avarias || []).length}</td>
                    <td className="td-r">
                      {parseFloat(row.taxaInspecao) > 0
                        ? <span style={{ color: '#DC2626' }}>R$ {parseFloat(row.taxaInspecao).toFixed(2)}</span>
                        : <span style={{ color: '#6B7280' }}>—</span>}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="btn-ghost p-1.5" onClick={() => setDetailId(row.id)} title="Ver detalhes">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button className="btn-ghost p-1.5" onClick={() => openEdit(row)} title="Editar inspeção">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
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

      <Modal open={modal} onClose={() => setModal(false)} title="Concluir check-out" size="lg">
        <div className="space-y-4">
          <div>
            <label className="field-label">Check-in</label>
            <select className="field-select" value={form.checkinId} onChange={F('checkinId')}>
              <option value="">Selecione um check-in ativo…</option>
              {checkinsSemCheckout.map(c => (
                <option key={c.id} value={c.id}>
                  #{c.id} — {c.veiculo?.placa || '—'} — {c.reserva?.cliente?.nome || ''}
                </option>
              ))}
            </select>
          </div>

          {selectedCheckin && (
            <div className="callout-info">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Quilometragem no check-in: <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {parseFloat(selectedCheckin.quilometragemCheckin).toLocaleString('pt-BR')} km
                </strong> — a devolução deve ser maior que este valor.
              </span>
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
              <label className="field-label">Data e hora do check-out</label>
              <input className="field-input" type="datetime-local" value={form.dataCheckout} onChange={F('dataCheckout')} />
            </div>
            <div>
              <label className="field-label">Quilometragem de devolução</label>
              <input
                className="field-input"
                type="number"
                min="0"
                step="0.01"
                value={form.quilometragemCheckout}
                onChange={F('quilometragemCheckout')}
                onBlur={validateKm}
              />
              {kmError && <p className="field-error">{kmError}</p>}
            </div>
            <div>
              <label className="field-label">Nível de combustível</label>
              <select className="field-select" value={form.nivelCombustivel} onChange={F('nivelCombustivel')}>
                {['Alto','Médio','Baixo','Vazio'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Condição dos pneus</label>
              <select className="field-select" value={form.condicaoPneus} onChange={F('condicaoPneus')}>
                {['Bom','Regular','Ruim','Furado'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Condição das palhetas</label>
              <select className="field-select" value={form.condicaoPalhetas} onChange={F('condicaoPalhetas')}>
                {['Boas','Ressecadas','Quebradas','Ausentes'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.limpoInternamente} onChange={FB('limpoInternamente')} className="h-4 w-4 rounded" style={{ accentColor: '#1B4FCE' }} />
              <span className="text-sm" style={{ color: '#374151' }}>Limpo internamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.limpoExternamente} onChange={FB('limpoExternamente')} className="h-4 w-4 rounded" style={{ accentColor: '#1B4FCE' }} />
              <span className="text-sm" style={{ color: '#374151' }}>Limpo externamente</span>
            </label>
          </div>

          {avarias.length > 0 && (
            <div>
              <label className="field-label">Avarias encontradas</label>
              <div className="border rounded-md p-3 space-y-2 max-h-36 overflow-y-auto" style={{ borderColor: '#E7E5E4' }}>
                {avarias.map(a => (
                  <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.avariaIds.includes(a.id)}
                      onChange={() => toggleAvaria(a.id)}
                      className="h-4 w-4 rounded"
                      style={{ accentColor: '#DC2626' }}
                    />
                    <span className="text-sm flex-1" style={{ color: '#374151' }}>{a.nome}</span>
                    <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#6B7280' }}>R$ {parseFloat(a.valor).toFixed(2)}</span>
                  </label>
                ))}
              </div>
              <p className="field-hint">Avarias geram multa automática. Taxa de inspeção de R$ 150,00 se o cliente tiver mais de 3 avarias no histórico.</p>
            </div>
          )}

          <div>
            <label className="field-label">Observações <span style={{ color: '#6B7280' }}>(opcional)</span></label>
            <textarea className="field-textarea" value={form.observacoes} onChange={F('observacoes')} maxLength={1000} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving || !!kmError}>
              {saving ? 'Processando…' : 'Concluir check-out'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title={`Editar check-out #${editId ?? ''}`} size="lg">
        {editForm && (
          <div className="space-y-4">
            <div className="callout-amber">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Quilometragem ({parseFloat(editForm.quilometragemCheckout).toLocaleString('pt-BR')} km) e
                avarias ({editForm.avariasCount}) são imutáveis — alterá-las exigiria refazer odômetro,
                taxa de inspeção e multa. Para corrigir, remova e refaça o check-out.
              </span>
            </div>

            <div>
              <label className="field-label">Funcionário responsável</label>
              <select className="field-select" value={editForm.funcionarioId} onChange={EF('funcionarioId')}>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="field-label">Combustível</label>
                <select className="field-select" value={editForm.nivelCombustivel} onChange={EF('nivelCombustivel')}>
                  {['Alto','Médio','Baixo','Vazio'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Pneus</label>
                <select className="field-select" value={editForm.condicaoPneus} onChange={EF('condicaoPneus')}>
                  {['Bom','Regular','Ruim','Furado'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Palhetas</label>
                <select className="field-select" value={editForm.condicaoPalhetas} onChange={EF('condicaoPalhetas')}>
                  {['Boas','Ressecadas','Quebradas','Ausentes'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.limpoInternamente} onChange={EFB('limpoInternamente')} className="h-4 w-4 rounded" style={{ accentColor: '#1B4FCE' }} />
                <span className="text-sm" style={{ color: '#374151' }}>Limpo internamente</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.limpoExternamente} onChange={EFB('limpoExternamente')} className="h-4 w-4 rounded" style={{ accentColor: '#1B4FCE' }} />
                <span className="text-sm" style={{ color: '#374151' }}>Limpo externamente</span>
              </label>
            </div>

            <div>
              <label className="field-label">Observações <span style={{ color: '#6B7280' }}>(opcional)</span></label>
              <textarea className="field-textarea" value={editForm.observacoes} onChange={EF('observacoes')} maxLength={1000} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setEditId(null)} disabled={editSaving}>Cancelar</button>
              <button className="btn-primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Salvando…' : 'Salvar alterações'}</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} loading={delLoading} title="Remover check-out" message="Este check-out será removido permanentemente. Confirma?" />

      <CheckoutDetail id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function Bool({ value }) {
  return value
    ? <span className="inline-flex items-center gap-1" style={{ color: '#16A34A' }}><Check className="h-3.5 w-3.5" /> Sim</span>
    : <span className="inline-flex items-center gap-1" style={{ color: '#DC2626' }}><X className="h-3.5 w-3.5" /> Não</span>;
}

function CheckoutDetail({ id, onClose }) {
  const { data: co, loading, error } = useDetail('/checkouts', id);
  // A multa gerada no check-out fica vinculada à reserva; busca via checkin.reservaId.
  const { data: reserva } = useDetail('/reservas', co?.checkin?.reservaId ?? null);

  const avarias = co?.avarias || [];
  const totalAvarias = avarias.reduce((s, a) => s + parseFloat(a.valor), 0);
  const taxa = parseFloat(co?.taxaInspecao ?? 0);
  const multas = reserva?.multas || [];

  return (
    <Modal open={id != null} onClose={onClose} title={co ? `Check-out #${co.id}` : 'Check-out'} size="xl">
      {loading && <p className="text-sm py-8 text-center" style={{ color: '#6B7280' }}>Carregando…</p>}
      {error && <p className="callout-warning">{error}</p>}
      {co && (
        <div className="space-y-6">
          <Section title="Devolução">
            <FieldGrid cols={3}>
              <Field label="Check-in vinculado" mono>#{co.checkinId}</Field>
              <Field label="Funcionário">{co.funcionario?.nome}</Field>
              <Field label="Data do check-out">{dateTime(co.dataCheckout)}</Field>
              <Field label="Km no check-in" mono>{km(co.checkin?.quilometragemCheckin)}</Field>
              <Field label="Km na devolução" mono>{km(co.quilometragemCheckout)}</Field>
              <Field label="Taxa de inspeção">
                {taxa > 0 ? <span style={{ color: '#DC2626' }}>{money(taxa)}</span> : '—'}
              </Field>
            </FieldGrid>
          </Section>

          <Section title="Inspeção">
            <FieldGrid cols={3}>
              <Field label="Combustível">{co.nivelCombustivel}</Field>
              <Field label="Pneus">{co.condicaoPneus}</Field>
              <Field label="Palhetas">{co.condicaoPalhetas}</Field>
              <Field label="Limpo internamente"><Bool value={co.limpoInternamente} /></Field>
              <Field label="Limpo externamente"><Bool value={co.limpoExternamente} /></Field>
            </FieldGrid>
            {co.observacoes && (
              <div className="mt-2">
                <Field label="Observações">{co.observacoes}</Field>
              </div>
            )}
          </Section>

          <Section title={`Avarias registradas (${avarias.length})`}>
            {avarias.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>Nenhuma avaria registrada.</p>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Avaria</th>
                      <th className="th-r">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {avarias.map(a => (
                      <tr key={a.id}>
                        <td className="td">{a.nome}</td>
                        <td className="td-r">{money(a.valor)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="td font-semibold" style={{ borderTop: '2px solid #E7E5E4' }}>Total</td>
                      <td className="td-r font-semibold" style={{ borderTop: '2px solid #E7E5E4' }}>{money(totalAvarias)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="Multa gerada">
            {multas.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>
                {avarias.length > 0 ? 'Nenhuma multa localizada para a reserva.' : 'Sem avarias — nenhuma multa gerada.'}
              </p>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">ID</th>
                      <th className="th">Status</th>
                      <th className="th">Descrição</th>
                      <th className="th">Emissão</th>
                      <th className="th-r">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {multas.map(m => (
                      <tr key={m.id}>
                        <td className="td-mono" style={{ color: '#6B7280' }}>#{m.id}</td>
                        <td className="td"><StatusBadge status={m.status} entity="multa" /></td>
                        <td className="td">{m.descricao}</td>
                        <td className="td">{dateOnly(m.dataEmissao)}</td>
                        <td className="td-r">{money(m.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {co.checkin?.reservaId && (
              <p className="field-hint">
                Multas exibidas pertencem à reserva #{co.checkin.reservaId}. Avarias geram multa
                automática limitada à franquia do seguro, quando houver.
              </p>
            )}
          </Section>
        </div>
      )}
    </Modal>
  );
}
