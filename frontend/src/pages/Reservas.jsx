import { useState } from 'react';
import { Plus, Trash2, Info, AlertTriangle, Eye, Pencil } from 'lucide-react';
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
import { Section, Field, FieldGrid, money, dateTime, dateOnly } from '../components/Detail.jsx';

const EMPTY = {
  clienteId: '', categoriaVeiculoId: '', funcionarioId: '', seguroId: '',
  agenciaRetiradaId: '', agenciaDevolucaoId: '', dataRetirada: '', dataDevolucao: '',
};

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Converte ISO para o formato aceito por <input type="datetime-local"> (YYYY-MM-DDTHH:mm), no fuso local.
function toInput(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// O <input datetime-local> devolve um horário local "cru" (sem fuso). Convertendo para ISO com fuso,
// o servidor (em UTC) interpreta o mesmo instante — sem isso, uma retirada minutos à frente é lida
// como "no passado" por causa do deslocamento UTC−3.
function toISO(v) {
  if (!v) return v;
  const d = new Date(v);
  return isNaN(d) ? v : d.toISOString();
}

export default function Reservas() {
  const { data, loading, refetch } = useCrud('/reservas');
  const list = useListView(data, r => `#${r.id} ${r.cliente?.nome ?? ''} ${r.status} ${r.categoriaVeiculo?.nome ?? ''} ${r.agenciaRetirada?.nome ?? ''}`);
  const { data: clientes } = useCrud('/clientes');
  const { data: categorias } = useCrud('/categoriasdeveiculos');
  const { data: funcionarios } = useCrud('/funcionarios');
  const { data: seguros } = useCrud('/seguros');
  const { data: agencias } = useCrud('/agencias');
  const toast = useToast();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [dateError, setDateError] = useState('');
  const [detailId, setDetailId] = useState(null);

  const F = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const agenciaRetirada = agencias.find(a => a.id === parseInt(form.agenciaRetiradaId));
  const agenciaDevolucao = agencias.find(a => a.id === parseInt(form.agenciaDevolucaoId));

  // Prévia de valores (estimativa). O total real é calculado no servidor e pode aplicar desconto.
  const catSel = categorias.find(c => c.id === parseInt(form.categoriaVeiculoId));
  const segSel = seguros.find(s => s.id === parseInt(form.seguroId));
  const diasEstimados = (form.dataRetirada && form.dataDevolucao && new Date(form.dataDevolucao) > new Date(form.dataRetirada))
    ? Math.ceil((new Date(form.dataDevolucao) - new Date(form.dataRetirada)) / 86400000)
    : 0;
  const diariaEstimada = catSel ? parseFloat(catSel.valorDiaria) : 0;
  const seguroDiariaEstimada = segSel ? parseFloat(segSel.valorDiariaAdicional) : 0;
  const totalEstimado = diasEstimados > 0 ? (diariaEstimada + seguroDiariaEstimada) * diasEstimados : 0;

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDateError(''); setModal(true); };
  const openEdit = (row) => {
    setEditing(row.id);
    setForm({
      clienteId: String(row.clienteId ?? ''),
      categoriaVeiculoId: String(row.categoriaVeiculoId ?? ''),
      funcionarioId: String(row.funcionarioId ?? ''),
      seguroId: row.seguroId ? String(row.seguroId) : '',
      agenciaRetiradaId: String(row.agenciaRetiradaId ?? ''),
      agenciaDevolucaoId: String(row.agenciaDevolucaoId ?? ''),
      dataRetirada: toInput(row.dataRetirada),
      dataDevolucao: toInput(row.dataDevolucao),
    });
    setDateError('');
    setModal(true);
  };

  const validateDates = () => {
    if (form.dataRetirada && new Date(form.dataRetirada) < new Date()) {
      setDateError('A data de retirada não pode ser no passado.');
      return false;
    }
    if (form.dataRetirada && form.dataDevolucao && new Date(form.dataDevolucao) <= new Date(form.dataRetirada)) {
      setDateError('A data de devolução deve ser posterior à data de retirada.');
      return false;
    }
    setDateError('');
    return true;
  };

  const save = async () => {
    if (!validateDates()) return;
    setSaving(true);
    try {
      const body = {
        clienteId: parseInt(form.clienteId),
        categoriaVeiculoId: parseInt(form.categoriaVeiculoId),
        funcionarioId: parseInt(form.funcionarioId),
        agenciaRetiradaId: parseInt(form.agenciaRetiradaId),
        agenciaDevolucaoId: parseInt(form.agenciaDevolucaoId),
        dataRetirada: toISO(form.dataRetirada),
        dataDevolucao: toISO(form.dataDevolucao),
        seguroId: form.seguroId ? parseInt(form.seguroId) : null,
      };
      if (editing) {
        await api.put(`/reservas/${editing}`, body);
        toast('Reserva atualizada.');
      } else {
        await api.post('/reservas', body);
        toast('Reserva criada.');
      }
      setModal(false);
      refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setDelLoading(true);
    try { await api.delete(`/reservas/${delId}`); toast('Reserva removida.'); setDelId(null); refetch(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setDelLoading(false); }
  };

  const confirmCancel = async () => {
    setCancelLoading(true);
    try { await api.put(`/reservas/${cancelId}`, { status: 'Cancelada' }); toast('Reserva cancelada.'); setCancelId(null); refetch(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setCancelLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Reservas</h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nova reserva
        </button>
      </div>

      {data.length > 0 && (
        <ListToolbar query={list.query} onQuery={list.setQuery} placeholder="Buscar por cliente, status ou categoria…" total={list.paginacao.total} />
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6B7280' }}>Carregando…</div>
        ) : data.length === 0 ? (
          <EmptyState message="Nenhuma reserva registrada." action={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Nova reserva</button>} />
        ) : list.isEmpty ? (
          <EmptyState message={`Nenhuma reserva encontrada para “${list.query}”.`} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">ID</th>
                  <th className="th">Status</th>
                  <th className="th">Cliente</th>
                  <th className="th">Categoria</th>
                  <th className="th">Ag. retirada</th>
                  <th className="th">Retirada</th>
                  <th className="th">Devolução</th>
                  <th className="th-r">Dias</th>
                  <th className="th-r">Valor final</th>
                  <th className="th" style={{ width: 150 }}></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map(row => (
                  <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                    <td className="td-mono" style={{ color: '#6B7280' }}>#{row.id}</td>
                    <td className="td"><StatusBadge status={row.status} /></td>
                    <td className="td font-medium">{row.cliente?.nome || '—'}</td>
                    <td className="td">{row.categoriaVeiculo?.nome || '—'}</td>
                    <td className="td">{row.agenciaRetirada?.nome || '—'}</td>
                    <td className="td">{fmt(row.dataRetirada)}</td>
                    <td className="td">{fmt(row.dataDevolucao)}</td>
                    <td className="td-r">{row.quantidadeDias}d</td>
                    <td className="td-r">R$ {parseFloat(row.valorFinal).toFixed(2)}</td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="btn-ghost p-1.5" onClick={() => setDetailId(row.id)} title="Ver detalhes">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {row.status === 'Pendente' && (
                          <button className="btn-ghost p-1.5" onClick={() => openEdit(row)} title="Editar reserva">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {row.status === 'Pendente' && (
                          <button className="btn-ghost p-1.5 text-xs" onClick={() => setCancelId(row.id)} title="Cancelar reserva">
                            <AlertTriangle className="h-3.5 w-3.5" style={{ color: '#F97316' }} />
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Editar reserva #${editing}` : 'Nova reserva'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Cliente</label>
              <select className="field-select" value={form.clienteId} onChange={F('clienteId')}>
                <option value="">Selecione…</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.cpf}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Categoria de veículo</label>
              <select className="field-select" value={form.categoriaVeiculoId} onChange={F('categoriaVeiculoId')}>
                <option value="">Selecione…</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome} — R$ {parseFloat(c.valorDiaria).toFixed(2)}/dia</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Funcionário responsável</label>
              <select className="field-select" value={form.funcionarioId} onChange={F('funcionarioId')}>
                <option value="">Selecione…</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Seguro <span style={{ color: '#6B7280' }}>(opcional)</span></label>
              <select className="field-select" value={form.seguroId} onChange={F('seguroId')}>
                <option value="">Sem seguro</option>
                {seguros.map(s => <option key={s.id} value={s.id}>{s.nome} — {s.empresaSeguradora}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Agência de retirada</label>
              <select className="field-select" value={form.agenciaRetiradaId} onChange={F('agenciaRetiradaId')}>
                <option value="">Selecione…</option>
                {agencias.map(a => <option key={a.id} value={a.id}>{a.nome} {a.status === 'Inativa' ? '(Inativa)' : ''}</option>)}
              </select>
              {agenciaRetirada?.status === 'Inativa' && (
                <p className="field-error">Esta agência está inativa e não pode receber reservas.</p>
              )}
            </div>
            <div>
              <label className="field-label">Agência de devolução</label>
              <select className="field-select" value={form.agenciaDevolucaoId} onChange={F('agenciaDevolucaoId')}>
                <option value="">Selecione…</option>
                {agencias.map(a => <option key={a.id} value={a.id}>{a.nome} {a.status === 'Inativa' ? '(Inativa)' : ''}</option>)}
              </select>
              {agenciaDevolucao?.status === 'Inativa' && (
                <p className="field-error">Esta agência está inativa e não pode receber reservas.</p>
              )}
            </div>
            <div>
              <label className="field-label">Data e hora de retirada</label>
              <input className="field-input" type="datetime-local" value={form.dataRetirada} onChange={F('dataRetirada')} onBlur={validateDates} />
              {dateError && <p className="field-error">{dateError}</p>}
              {!dateError && <p className="field-hint">Não pode ser no passado</p>}
            </div>
            <div>
              <label className="field-label">Data e hora de devolução</label>
              <input className="field-input" type="datetime-local" value={form.dataDevolucao} onChange={F('dataDevolucao')} />
            </div>
          </div>

          {diasEstimados > 0 && catSel && (
            <div className="card p-4" style={{ backgroundColor: '#FAFAF9' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Estimativa</p>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt style={{ color: '#6B7280' }}>Diárias ({money(diariaEstimada)} × {diasEstimados})</dt>
                  <dd style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(diariaEstimada * diasEstimados)}</dd>
                </div>
                {segSel && (
                  <div className="flex justify-between">
                    <dt style={{ color: '#6B7280' }}>Seguro ({money(seguroDiariaEstimada)} × {diasEstimados})</dt>
                    <dd style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(seguroDiariaEstimada * diasEstimados)}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 font-semibold" style={{ borderTop: '1px solid #E7E5E4' }}>
                  <dt>Total estimado</dt>
                  <dd style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(totalEstimado)}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="callout-info">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Estimativa antes de descontos. Os valores finais (diária, seguro, total e dias) são calculados pelo servidor; agências com histórico podem aplicar desconto por período.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar reserva'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={confirmCancel}
        loading={cancelLoading}
        title="Cancelar reserva"
        message="Esta reserva será marcada como Cancelada. Essa ação não pode ser desfeita. Confirma?"
      />

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={confirmDelete}
        loading={delLoading}
        title="Remover reserva"
        message="Esta reserva será removida permanentemente. Confirma?"
      />

      <ReservaDetail id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function ReservaDetail({ id, onClose }) {
  const { data: r, loading, error } = useDetail('/reservas', id);

  const dias = r?.quantidadeDias ?? 0;
  const valorDiaria = parseFloat(r?.valorDiaria ?? 0);
  const valorSeguro = parseFloat(r?.valorSeguro ?? 0);
  const valorFinal = parseFloat(r?.valorFinal ?? 0);
  const subtotalDiarias = valorDiaria * dias;
  const valorBruto = subtotalDiarias + valorSeguro;
  const descontoAplicado = Math.max(0, parseFloat((valorBruto - valorFinal).toFixed(2)));
  const multas = r?.multas || [];

  return (
    <Modal open={id != null} onClose={onClose} title={r ? `Reserva #${r.id}` : 'Reserva'} size="xl">
      {loading && <p className="text-sm py-8 text-center" style={{ color: '#6B7280' }}>Carregando…</p>}
      {error && <p className="callout-warning">{error}</p>}
      {r && (
        <div className="space-y-6">
          <Section title="Reserva">
            <FieldGrid cols={3}>
              <Field label="Status"><StatusBadge status={r.status} /></Field>
              <Field label="Cliente">{r.cliente?.nome}</Field>
              <Field label="Categoria">{r.categoriaVeiculo?.nome}</Field>
              <Field label="Funcionário">{r.funcionario?.nome}</Field>
              <Field label="Agência de retirada">{r.agenciaRetirada?.nome}</Field>
              <Field label="Agência de devolução">{r.agenciaDevolucao?.nome}</Field>
              <Field label="Retirada">{dateTime(r.dataRetirada)}</Field>
              <Field label="Devolução">{dateTime(r.dataDevolucao)}</Field>
              <Field label="Duração">{dias} dia(s)</Field>
              <Field label="Criada em">{dateTime(r.createdAt ?? r.created_at)}</Field>
            </FieldGrid>
          </Section>

          <Section title="Seguro">
            {r.seguro ? (
              <FieldGrid cols={3}>
                <Field label="Plano">{r.seguro.nome}</Field>
                <Field label="Seguradora">{r.seguro.empresaSeguradora}</Field>
                <Field label="Franquia" mono>{money(r.seguro.franquia)}</Field>
              </FieldGrid>
            ) : (
              <p className="text-sm" style={{ color: '#6B7280' }}>Reserva sem seguro.</p>
            )}
          </Section>

          <Section title="Quebra financeira">
            <div className="card overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="td">Diárias ({money(valorDiaria)} × {dias})</td>
                    <td className="td-r">{money(subtotalDiarias)}</td>
                  </tr>
                  <tr>
                    <td className="td">Seguro (período)</td>
                    <td className="td-r">{money(valorSeguro)}</td>
                  </tr>
                  <tr>
                    <td className="td font-medium">Subtotal</td>
                    <td className="td-r font-medium">{money(valorBruto)}</td>
                  </tr>
                  <tr>
                    <td className="td" style={{ color: descontoAplicado > 0 ? '#16A34A' : '#6B7280' }}>
                      Desconto aplicado
                    </td>
                    <td className="td-r" style={{ color: descontoAplicado > 0 ? '#16A34A' : '#6B7280' }}>
                      {descontoAplicado > 0 ? `− ${money(descontoAplicado)}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="td font-semibold" style={{ borderTop: '2px solid #E7E5E4' }}>Valor final</td>
                    <td className="td-r font-semibold" style={{ borderTop: '2px solid #E7E5E4' }}>{money(valorFinal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {r.agenciaRetirada && (
              <p className="field-hint">
                Política da agência de retirada: {parseFloat(r.agenciaRetirada.percentualDesconto).toFixed(0)}% de
                desconto para reservas de {r.agenciaRetirada.limiteDiasDesconto}+ dias, condicionado ao
                histórico operacional da agência (≥ 2 reservas concluídas).
              </p>
            )}
          </Section>

          <Section title={`Multas vinculadas (${multas.length})`}>
            {multas.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>Nenhuma multa vinculada.</p>
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
          </Section>
        </div>
      )}
    </Modal>
  );
}
