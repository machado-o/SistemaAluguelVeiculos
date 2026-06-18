import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Wrench } from 'lucide-react';
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
import { Section, Field, FieldGrid, money, km, dateTime } from '../components/Detail.jsx';

const MARCAS = ['Toyota','Jeep','Honda','Fiat','KIA','Ford','BYD','Chevrolet','Hyundai','Volkswagen','Nissan','Mazda','Subaru','Renault','BMW','Mercedes-Benz','Audi','Volvo'];
const CORES = ['Branco','Preto','Cinza','Prata','Outra'];
const EMPTY = { placa: '', chassi: '', marca: 'Toyota', modelo: '', cor: 'Branco', anoFabricacao: '', quilometragem: '', status: 'Disponível', categoriaVeiculoId: '', agenciaId: '' };

export default function Veiculos() {
  const { data, loading, refetch } = useCrud('/veiculos');
  const { data: categorias } = useCrud('/categoriasdeveiculos');
  const { data: agencias } = useCrud('/agencias');
  const list = useListView(data, r => `${r.placa} ${r.marca} ${r.modelo} ${r.cor}`);
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const F = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const FUpper = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value.toUpperCase() }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (row) => {
    setEditing(row.id);
    setForm({ placa: row.placa, chassi: row.chassi, marca: row.marca, modelo: row.modelo, cor: row.cor, anoFabricacao: row.anoFabricacao, quilometragem: row.quilometragem, status: row.status, categoriaVeiculoId: row.categoriaVeiculoId, agenciaId: row.agenciaId });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, quilometragem: parseFloat(form.quilometragem), categoriaVeiculoId: parseInt(form.categoriaVeiculoId), agenciaId: parseInt(form.agenciaId) };
      if (editing) { await api.put(`/veiculos/${editing}`, body); toast('Veículo atualizado.'); }
      else { await api.post('/veiculos', body); toast('Veículo criado.'); }
      setModal(false); refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setDelLoading(true);
    try { await api.delete(`/veiculos/${delId}`); toast('Veículo removido.'); setDelId(null); refetch(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setDelLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Veículos</h1>
        <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Novo veículo</button>
      </div>

      {data.length > 0 && (
        <ListToolbar query={list.query} onQuery={list.setQuery} placeholder="Buscar por placa, marca ou modelo…" total={list.paginacao.total} />
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6B7280' }}>Carregando…</div>
        ) : data.length === 0 ? (
          <EmptyState message="Nenhum veículo cadastrado." action={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Novo veículo</button>} />
        ) : list.isEmpty ? (
          <EmptyState message={`Nenhum veículo encontrado para “${list.query}”.`} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Placa</th>
                  <th className="th">Veículo</th>
                  <th className="th">Cor / Ano</th>
                  <th className="th-r">Quilometragem</th>
                  <th className="th">Categoria</th>
                  <th className="th">Agência</th>
                  <th className="th">Status</th>
                  <th className="th" style={{ width: 110 }}></th>
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map(row => (
                  <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                    <td className="td-mono font-semibold">{row.placa}</td>
                    <td className="td">
                      <div className="font-medium">{row.marca}</div>
                      <div className="text-xs" style={{ color: '#6B7280' }}>{row.modelo}</div>
                    </td>
                    <td className="td">
                      <div>{row.cor}</div>
                      <div className="text-xs" style={{ color: '#6B7280' }}>{row.anoFabricacao}</div>
                    </td>
                    <td className="td-r">{parseFloat(row.quilometragem).toLocaleString('pt-BR')} km</td>
                    <td className="td">{row.categoria?.nome || '—'}</td>
                    <td className="td">{row.agencia?.nome || '—'}</td>
                    <td className="td"><StatusBadge status={row.status} /></td>
                    <td className="td">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="btn-ghost p-1.5" onClick={() => setDetailId(row.id)} title="Ver detalhes"><Eye className="h-3.5 w-3.5" /></button>
                        <button className="btn-ghost p-1.5" onClick={() => openEdit(row)} title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                        <button className="btn-ghost p-1.5" onClick={() => setDelId(row.id)} title="Remover"><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar veículo' : 'Novo veículo'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Placa</label>
              <input className="field-input font-mono" value={form.placa} onChange={FUpper('placa')} maxLength={7} placeholder="ABC1D23" style={{ fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }} />
              <p className="field-hint">Padrão Mercosul ou antigo</p>
            </div>
            <div>
              <label className="field-label">Chassi</label>
              <input className="field-input font-mono" value={form.chassi} onChange={FUpper('chassi')} maxLength={17} style={{ fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }} />
              <p className="field-hint">17 caracteres alfanuméricos</p>
            </div>
            <div>
              <label className="field-label">Marca</label>
              <select className="field-select" value={form.marca} onChange={F('marca')}>
                {MARCAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Modelo</label>
              <input className="field-input" value={form.modelo} onChange={F('modelo')} maxLength={50} />
            </div>
            <div>
              <label className="field-label">Cor</label>
              <select className="field-select" value={form.cor} onChange={F('cor')}>
                {CORES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Ano de fabricação</label>
              <input className="field-input" value={form.anoFabricacao} onChange={F('anoFabricacao')} placeholder="YYYY" maxLength={4} />
            </div>
            <div>
              <label className="field-label">Quilometragem atual</label>
              <input className="field-input" type="number" min="0" step="0.01" value={form.quilometragem} onChange={F('quilometragem')} />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field-select" value={form.status} onChange={F('status')}>
                <option>Disponível</option><option>Reservado</option><option>Manutenção</option>
              </select>
            </div>
            <div>
              <label className="field-label">Categoria</label>
              <select className="field-select" value={form.categoriaVeiculoId} onChange={F('categoriaVeiculoId')}>
                <option value="">Selecione…</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Agência</label>
              <select className="field-select" value={form.agenciaId} onChange={F('agenciaId')}>
                <option value="">Selecione…</option>
                {agencias.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar veículo'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={confirmDelete} loading={delLoading} title="Remover veículo" message="Este veículo será removido permanentemente. Confirma?" />

      <VeiculoDetail id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function VeiculoDetail({ id, onClose }) {
  const { data: v, loading, error } = useDetail('/veiculos', id);
  const checkins = (v?.checkins || []).slice().sort((a, b) => new Date(b.dataCheckin) - new Date(a.dataCheckin));

  return (
    <Modal open={id != null} onClose={onClose} title={v ? `${v.marca} ${v.modelo} — ${v.placa}` : 'Veículo'} size="xl">
      {loading && <p className="text-sm py-8 text-center" style={{ color: '#6B7280' }}>Carregando…</p>}
      {error && <p className="callout-warning">{error}</p>}
      {v && (
        <div className="space-y-6">
          {v.status === 'Manutenção' && (
            <div className="callout-warning">
              <Wrench className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Veículo em <strong>manutenção</strong> — indisponível para novas operações.</span>
            </div>
          )}

          <Section title="Dados do veículo">
            <FieldGrid cols={3}>
              <Field label="Placa" mono>{v.placa}</Field>
              <Field label="Chassi" mono>{v.chassi}</Field>
              <Field label="Status"><StatusBadge status={v.status} /></Field>
              <Field label="Cor / ano">{v.cor} · {v.anoFabricacao}</Field>
              <Field label="Categoria">{v.categoria?.nome}</Field>
              <Field label="Agência">{v.agencia?.nome}</Field>
              <Field label="Quilometragem atual" mono>{km(v.quilometragem)}</Field>
              <Field label="Diária da categoria" mono>{money(v.categoria?.valorDiaria)}</Field>
            </FieldGrid>
          </Section>

          <Section title={`Histórico de check-ins (${checkins.length})`}>
            {checkins.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>Nenhum check-in registrado.</p>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">ID</th>
                      <th className="th">Data</th>
                      <th className="th">Condutor (CNH)</th>
                      <th className="th-r">Km no check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkins.map(ci => (
                      <tr key={ci.id}>
                        <td className="td-mono" style={{ color: '#6B7280' }}>#{ci.id}</td>
                        <td className="td">{dateTime(ci.dataCheckin)}</td>
                        <td className="td-mono">{ci.cnhCondutor}</td>
                        <td className="td-r">{km(ci.quilometragemCheckin)}</td>
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
