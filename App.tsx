
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Package, 
  Truck, 
  User, 
  Users,
  Search, 
  FileUp, 
  CheckCircle2, 
  MapPin, 
  DollarSign, 
  Camera, 
  X, 
  ImageIcon, 
  RotateCcw, 
  Navigation, 
  ClipboardList, 
  Menu,
  Trash2,
  Plus,
  LayoutDashboard,
  AlertCircle,
  Play,
  Database,
  ShieldCheck,
  LogOut,
  ShoppingBag,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Delivery, DeliveryStatus, UserRole, Driver, Load } from './types';
import { generateTrackingMessage } from './services/geminiService';
import { saveData, getData } from './services/dbService';
import { compressImage } from './services/imageUtils';

const ADMIN_PASSWORD_DEFAULT = 'admin123';

const App: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loggedRole, setLoggedRole] = useState<UserRole | null>(null);
  const [activeView, setActiveView] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriverName, setSelectedDriverName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Login States
  const [authStep, setAuthStep] = useState<'CHOICE' | 'CREDENTIALS'>('CHOICE');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [driverLoginId, setDriverLoginId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Management States
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPass, setNewDriverPass] = useState('');
  const [expandedLoadId, setExpandedLoadId] = useState<string | null>(null);
  
  const [pendingImport, setPendingImport] = useState<any[] | null>(null);
  const [importDriverId, setImportDriverId] = useState<string>('');
  const [loadName, setLoadName] = useState<string>('');
  const [pickupDate, setPickupDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [departureDate, setDepartureDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [photoModal, setPhotoModal] = useState<{id: string, customer: string} | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{id: string, customer: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStoredData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      console.log("[App] Iniciando carregamento de dados...");
      const [storedDeliveries, storedDrivers, storedLoads] = await Promise.all([
        getData('deliveries'),
        getData('drivers'),
        getData('loads')
      ]);
      
      if (storedDeliveries === null || storedDrivers === null || storedLoads === null) {
        setDbConnected(false);
        setDbError("Não foi possível conectar ao banco de dados. Verifique se as tabelas existem no Supabase.");
        return;
      }

      setDbConnected(true);
      setDeliveries(storedDeliveries);
      setLoads(storedLoads);
      setDrivers(storedDrivers);
      
      console.log("[App] Dados carregados com sucesso.");
    } catch (err) { 
      console.error("[App] Falha ao inicializar banco:", err); 
      setDbConnected(false);
      setDbError("Erro na inicialização do banco de dados.");
    } finally { 
      setIsInitialized(true); 
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoredData();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSaving]);

  // Debounced Save Effects
  useEffect(() => {
    if (!isInitialized || !dbConnected) return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      await saveData('deliveries', deliveries);
      setIsSaving(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [deliveries, isInitialized, dbConnected]);

  useEffect(() => {
    if (!isInitialized || !dbConnected) return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      await saveData('drivers', drivers);
      setIsSaving(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [drivers, isInitialized, dbConnected]);

  useEffect(() => {
    if (!isInitialized || !dbConnected) return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      await saveData('loads', loads);
      setIsSaving(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [loads, isInitialized, dbConnected]);

  const clearAllData = async () => {
    if (!window.confirm("ATENÇÃO: Isso apagará permanentEMENTE todos os motoristas, cargas e entregas do banco de dados. Deseja continuar?")) {
      return;
    }

    setLoading(true);
    try {
      // Limpa o estado local
      setDeliveries([]);
      setLoads([]);
      setDrivers([]);

      // Sincroniza a limpeza com o Supabase
      await Promise.all([
        saveData('deliveries', []),
        saveData('loads', []),
        saveData('drivers', [])
      ]);

      setAiMessage("Banco de dados limpo com sucesso!");
      setTimeout(() => setAiMessage(null), 3000);
    } catch (err) {
      console.error("Erro ao limpar banco:", err);
      setAiMessage("Erro ao limpar banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const forceSync = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        saveData('deliveries', deliveries),
        saveData('drivers', drivers),
        saveData('loads', loads)
      ]);
      setAiMessage("Sincronização forçada concluída!");
      setTimeout(() => setAiMessage(null), 3000);
    } catch (err) {
      setAiMessage("Erro na sincronização manual.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = () => {
    setAuthError(null);
    if (selectedRole === 'ADMIN') {
      if (passwordInput === ADMIN_PASSWORD_DEFAULT) {
        setLoggedRole('ADMIN');
        setActiveView('ADMIN_PANEL');
      } else {
        setAuthError('Senha de administrador incorreta.');
      }
    } else if (selectedRole === 'MOTORISTA') {
      const driver = drivers.find(d => d.id === driverLoginId);
      if (driver && driver.password === passwordInput) {
        setLoggedRole('MOTORISTA');
        setSelectedDriverName(driver.name);
        setActiveView('DRIVER_PORTAL');
      } else {
        setAuthError('Nome ou senha do motorista incorretos.');
      }
    } else if (selectedRole === 'VENDEDOR') {
      setLoggedRole('VENDEDOR');
      setActiveView('LOADS_MGMT');
    }
  };

  const logout = () => {
    setLoggedRole(null);
    setAuthStep('CHOICE');
    setSelectedRole(null);
    setPasswordInput('');
    setDriverLoginId('');
    setSelectedDriverName('');
    setAuthError(null);
    setIsMenuOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const rows = rawRows.slice(1);
        const parsedData = rows.map(row => {
          if (!row[1] && !row[5]) return null;
          return {
            orderNumber: String(row[1] || ''),
            orderValue: parseFloat(String(row[3]).replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            customerName: String(row[5] || 'Cliente Indefinido'),
            city: String(row[9] || 'Belém'),
            address: String(row[8] || `${row[9] || 'Belém'}, Pará`)
          };
        }).filter(Boolean);
        setPendingImport(parsedData);
      } catch (err) { alert("Erro ao ler o arquivo Excel."); }
      finally { setLoading(false); e.target.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    if (!pendingImport || !importDriverId || !loadName.trim()) return;
    
    const selectedDriverObj = drivers.find(d => d.id === importDriverId);
    const driverName = selectedDriverObj ? selectedDriverObj.name : 'Não Atribuído';
    
    const newLoadId = crypto.randomUUID();
    const newLoad: Load = {
      id: newLoadId,
      name: loadName.trim(),
      driverId: importDriverId,
      driverName: driverName,
      pickupDate: pickupDate,
      departureDate: departureDate,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const newDeliveries: Delivery[] = pendingImport.map(item => ({
      id: crypto.randomUUID(),
      orderNumber: item.orderNumber,
      orderValue: item.orderValue,
      customerName: item.customerName,
      city: item.city,
      address: item.address,
      driverName: driverName,
      status: DeliveryStatus.PENDING,
      updatedAt: new Date().toISOString(),
      lat: -1.4558 + (Math.random() * 0.1 - 0.05),
      lng: -48.4902 + (Math.random() * 0.1 - 0.05),
      loadId: newLoadId,
      notes: '',
      receiptPhoto: ''
    }));

    setLoads(prev => [...prev, newLoad]);
    setDeliveries(prev => [...prev, ...newDeliveries]);
    setPendingImport(null);
    setImportDriverId('');
    setLoadName('');
    setAiMessage(`${newDeliveries.length} entregas importadas na carga ${newLoad.name}!`);
    setTimeout(() => setAiMessage(null), 3000);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoModal) return;
    
    // Captura os dados atuais do modal antes de fechá-lo
    const currentId = photoModal.id;
    const currentCustomer = photoModal.customer;
    
    // Fecha o modal imediatamente para dar feedback ao usuário
    setPhotoModal(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawBase64 = evt.target?.result as string;
        
        // Comprime a imagem para evitar erros de limite de tamanho no banco de dados
        const compressedBase64 = await compressImage(rawBase64, 1024, 1024, 0.6);
        
        setDeliveries(prev => prev.map(d => 
          d.id === currentId ? { 
            ...d, 
            status: DeliveryStatus.DELIVERED, 
            receiptPhoto: compressedBase64, 
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } : d
        ));

        // Gera a mensagem de IA em background (não bloqueia a UI)
        generateTrackingMessage(DeliveryStatus.DELIVERED, currentCustomer).then(msg => {
          setAiMessage(msg);
          setTimeout(() => setAiMessage(null), 5000);
        }).catch(err => console.error("Erro na IA:", err));

      } catch (err) {
        console.error("Erro ao processar foto:", err);
        setAiMessage("Erro ao salvar foto. Tente novamente.");
        setTimeout(() => setAiMessage(null), 3000);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      console.error("Erro na leitura do arquivo");
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const updateDeliveryStatus = (id: string, newStatus: DeliveryStatus) => {
    const delivery = deliveries.find(d => d.id === id);
    if (!delivery) return;
    if (newStatus === DeliveryStatus.DELIVERED) { setPhotoModal({ id, customer: delivery.customerName }); return; }
    if (newStatus === DeliveryStatus.REJECTED) { setRejectionModal({ id, customer: delivery.customerName }); return; }
    setDeliveries(prev => prev.map(d => 
      d.id === id ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
    ));
  };

  const handleStartAllRoutes = () => {
    if (!selectedDriverName) return;
    
    // Encontrar as cargas deste motorista que estão pendentes
    const driverLoads = loads.filter(l => l.driverName === selectedDriverName && l.status === 'PENDING');
    const loadIdsToUpdate = driverLoads.map(l => l.id);

    setLoads(prev => prev.map(l => 
      loadIdsToUpdate.includes(l.id) ? { ...l, status: 'IN_TRANSIT' } : l
    ));

    setDeliveries(prev => prev.map(d => {
      if (d.driverName === selectedDriverName && d.status === DeliveryStatus.PENDING) {
        return { ...d, status: DeliveryStatus.IN_TRANSIT, updatedAt: new Date().toISOString() };
      }
      return d;
    }));
    setAiMessage("Todos os seus pedidos e cargas estão em rota!");
    setTimeout(() => setAiMessage(null), 4000);
  };

  const filteredDeliveries = deliveries.filter(d => 
    d.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const driversOrders = deliveries.filter(d => d.driverName === selectedDriverName);
  const pendingOrdersForDriver = driversOrders.filter(d => d.status === DeliveryStatus.PENDING);

  // --- RENDERING LOGIC ---

  if (!loggedRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white overflow-y-auto">
        <div className="mb-8 text-center space-y-2">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Package className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter">SwiftLog</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">SISTEMA DE LOGÍSTICA PRIVADO</p>
        </div>

        {authStep === 'CHOICE' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl animate-in fade-in zoom-in-95 duration-300">
            {[
              { id: 'ADMIN', label: 'Administrador', icon: ShieldCheck, color: 'bg-blue-600', desc: 'Controle total de carga' },
              { id: 'MOTORISTA', label: 'Motorista', icon: Truck, color: 'bg-indigo-600', desc: 'Acesso às minhas cargas' },
              { id: 'VENDEDOR', label: 'Vendedor', icon: ShoppingBag, color: 'bg-emerald-600', desc: 'Rastreio de pedidos' },
            ].map(role => (
              <button 
                key={role.id}
                onClick={() => { setSelectedRole(role.id as UserRole); setAuthStep('CREDENTIALS'); }}
                className="bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-blue-500 transition-all group text-left space-y-4 hover:-translate-y-2 shadow-xl"
              >
                <div className={`${role.color} w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <role.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">{role.label}</h3>
                  <p className="text-sm text-slate-500 font-medium">{role.desc}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
              <button onClick={() => {setAuthStep('CHOICE'); setAuthError(null);}} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-5 h-5" /></button>
              <div>
                <h2 className="font-black uppercase text-sm tracking-widest">{selectedRole === 'ADMIN' ? 'Acesso Restrito' : selectedRole === 'MOTORISTA' ? 'Login Motorista' : 'Acesso Vendedor'}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Identifique-se para continuar</p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedRole === 'MOTORISTA' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Selecione seu Nome</label>
                  <select 
                    value={driverLoginId}
                    onChange={(e) => setDriverLoginId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
                  >
                    <option value="">Escolha seu perfil...</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {(selectedRole === 'ADMIN' || selectedRole === 'MOTORISTA') && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Sua Senha</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {selectedRole === 'VENDEDOR' && (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-400 font-medium">O acesso de vendedor permite apenas a consulta pública de status de pedidos.</p>
                </div>
              )}

              {authError && (
                <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded-xl flex items-center gap-3 animate-shake">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-[10px] font-black uppercase">{authError}</p>
                </div>
              )}

              <button 
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-blue-500/10 transition-all active:scale-95"
              >
                Entrar no Sistema
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MAIN APP ---
  const navItems = [];
  if (loggedRole === 'ADMIN') {
    navItems.push({ id: 'ADMIN_PANEL', label: 'Painel Geral', icon: LayoutDashboard });
    navItems.push({ id: 'LOADS_MGMT', label: 'Gestão de Cargas', icon: ClipboardList });
    navItems.push({ id: 'DRIVERS_MGMT', label: 'Motoristas', icon: Users });
  } else if (loggedRole === 'MOTORISTA') {
    navItems.push({ id: 'DRIVER_PORTAL', label: 'Meu Portal', icon: Truck });
  } else if (loggedRole === 'VENDEDOR') {
    navItems.push({ id: 'LOADS_MGMT', label: 'Cargas Ativas', icon: ClipboardList });
    navItems.push({ id: 'TRACKING', label: 'Rastreio', icon: Search });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      
      {/* Mobile Top Header (Restaura o acesso ao menu no mobile) */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-black tracking-tighter">SwiftLog</h1>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white p-5 flex flex-col transition-transform duration-300 transform 
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:flex shadow-2xl
      `}>
        <div className="flex items-center justify-between md:justify-start gap-2 mb-8 px-2">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-black tracking-tighter leading-none">SwiftLog</h1>
          </div>
          <button onClick={() => setIsMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => { setActiveView(item.id); setIsMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === item.id ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 font-medium'}`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-black">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800 space-y-4">
           <div className="px-2">
              <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">SESSÃO ATIVA</p>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                 <p className="text-xs font-black text-white truncate">{loggedRole === 'MOTORISTA' ? selectedDriverName : loggedRole}</p>
              </div>
           </div>
           
           <div className="px-2">
              <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">BANCO DE DADOS</p>
              <div className="flex items-center gap-2 mt-1">
                 <div className={`w-2 h-2 rounded-full ${dbConnected === true ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : dbConnected === false ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`}></div>
                 <p className="text-[10px] font-black text-white truncate">
                   {dbConnected === true ? 'Conectado' : dbConnected === false ? 'Desconectado' : 'Conectando...'}
                 </p>
              </div>
           </div>

           <button onClick={logout} className="w-full bg-slate-800 hover:bg-red-900/40 text-red-400 p-3 rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase transition-colors">
              <LogOut className="w-4 h-4" /> Sair / Trocar Perfil
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-x-hidden relative">
        {aiMessage && (
          <div className="fixed top-20 md:top-5 right-5 z-[60] animate-in slide-in-from-right-10 duration-300">
            <div className="bg-white border-l-4 border-blue-600 text-slate-800 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <p className="text-[10px] font-black uppercase text-slate-600">{aiMessage}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
              {activeView === 'ADMIN_PANEL' && "Administração Geral"}
              {activeView === 'LOADS_MGMT' && "Gestão de Cargas"}
              {activeView === 'DRIVERS_MGMT' && "Gestão de Frota"}
              {activeView === 'DRIVER_PORTAL' && `Minhas Entregas`}
              {activeView === 'TRACKING' && "Consultar Rastreio"}
            </h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {activeView === 'ADMIN_PANEL' && "Controle total de pedidos e logística"}
              {activeView === 'LOADS_MGMT' && "Acompanhamento de lotes e datas de saída"}
              {activeView === 'DRIVERS_MGMT' && "Cadastro e monitoramento de motoristas"}
              {activeView === 'DRIVER_PORTAL' && "Suas rotas e entregas pendentes"}
              {activeView === 'TRACKING' && "Localize pedidos em tempo real"}
            </p>
          </div>
          {activeView === 'ADMIN_PANEL' && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 transition-all ${dbConnected ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <Database className={`w-4 h-4 ${dbConnected ? (isSaving ? 'animate-spin' : 'animate-pulse') : ''}`} />
                <div className="text-left">
                  <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-0.5">Status DB</p>
                  <p className="text-[9px] font-bold leading-none">
                    {dbConnected ? (isSaving ? 'Sincronizando...' : 'Sincronizado') : 'Desconectado'}
                  </p>
                </div>
                {dbConnected && (
                  <button 
                    onClick={forceSync}
                    className="ml-1 p-1 hover:bg-green-100 rounded-lg transition-all"
                    title="Sincronizar Agora"
                  >
                    <RotateCcw className={`w-3 h-3 ${isSaving ? 'animate-spin' : ''}`} />
                  </button>
                )}
                {!dbConnected && (
                  <button 
                    onClick={loadStoredData}
                    className="ml-2 bg-red-600 text-white p-1.5 rounded-lg active:scale-95 transition-all"
                    title="Tentar Reconectar"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-black cursor-pointer transition-all active:scale-95 uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200 w-full sm:w-auto">
                <FileUp className="w-4 h-4" /> Importar Planilha
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              </label>
              <button 
                onClick={clearAllData}
                className="flex items-center justify-center gap-2 bg-white text-red-600 border border-red-100 px-5 py-3 rounded-xl font-black transition-all active:scale-95 uppercase text-[10px] tracking-widest hover:bg-red-50 w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4" /> Limpar Banco
              </button>
            </div>
          )}
        </div>

        {/* Global Search - Only show in relevant views */}
        {(activeView === 'ADMIN_PANEL' || activeView === 'DRIVER_PORTAL' || activeView === 'TRACKING' || activeView === 'LOADS_MGMT') && (
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Filtrar pedidos, clientes, destinos ou cargas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 text-xs shadow-sm transition-all focus:shadow-md"
            />
          </div>
        )}

        {/* DRIVER PORTAL SPECIFIC ACTIONS */}
        {activeView === 'DRIVER_PORTAL' && pendingOrdersForDriver.length > 0 && (
          <button 
            onClick={handleStartAllRoutes}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-[0.98] border-b-4 border-blue-800"
          >
            <Play className="w-4 h-4 fill-white" />
            Iniciar Toda a Carga ({pendingOrdersForDriver.length} itens)
          </button>
        )}

        {/* LISTA DE ENTREGAS (Condicional) */}
        {(activeView === 'ADMIN_PANEL' || activeView === 'DRIVER_PORTAL' || activeView === 'TRACKING') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeView === 'DRIVER_PORTAL' ? driversOrders : filteredDeliveries).map((delivery) => {
              const load = loads.find(l => l.id === delivery.loadId);
              return (
                <div key={delivery.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between animate-fade-in">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-mono text-blue-600 font-black text-sm">#{delivery.orderNumber}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                        delivery.status === DeliveryStatus.DELIVERED ? 'bg-green-50 text-green-700 border-green-200' :
                        delivery.status === DeliveryStatus.IN_TRANSIT ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        delivery.status === DeliveryStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {delivery.status}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 text-base uppercase leading-tight mb-2">{delivery.customerName}</h3>
                    <div className="space-y-1.5">
                       <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-red-400" /> {delivery.city}
                       </p>
                       <p className="text-[9px] text-slate-500 italic leading-snug">{delivery.address}</p>
                       
                       {load && (
                         <div className="flex flex-wrap gap-2 pt-1">
                           <span className="text-[8px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase">
                             <RotateCcw className="w-2.5 h-2.5" /> Coleta: {new Date(load.pickupDate).toLocaleDateString('pt-BR')}
                           </span>
                           <span className="text-[8px] font-bold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase">
                             <Navigation className="w-2.5 h-2.5" /> Saída: {new Date(load.departureDate).toLocaleDateString('pt-BR')}
                           </span>
                         </div>
                       )}

                       <div className="flex items-center gap-2 pt-2">
                          <span className="text-[9px] font-black bg-green-50 text-green-700 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                             <DollarSign className="w-3 h-3" /> {delivery.orderValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          {(loggedRole === 'ADMIN' || (loggedRole === 'VENDEDOR' && load)) && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                              <Truck className="w-3 h-3" /> {delivery.driverName}
                            </span>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-5 pt-4 border-t border-slate-50">
                    {activeView === 'DRIVER_PORTAL' && delivery.status !== DeliveryStatus.DELIVERED && delivery.status !== DeliveryStatus.REJECTED && (
                      <>
                        <button onClick={() => updateDeliveryStatus(delivery.id, DeliveryStatus.REJECTED)} className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 flex items-center justify-center active:scale-95 transition-colors" title="Devolver">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        {delivery.status === DeliveryStatus.PENDING ? (
                          <button onClick={() => updateDeliveryStatus(delivery.id, DeliveryStatus.IN_TRANSIT)} className="flex-1 bg-indigo-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase active:scale-95 shadow-lg shadow-indigo-100">
                             <Navigation className="w-3 h-3" /> Iniciar
                          </button>
                        ) : (
                          <button onClick={() => updateDeliveryStatus(delivery.id, DeliveryStatus.DELIVERED)} className="flex-1 bg-green-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase active:scale-95 shadow-lg shadow-green-100">
                             <Camera className="w-4 h-4" /> Finalizar
                          </button>
                        )}
                      </>
                    )}
                    {delivery.receiptPhoto && (
                      <button onClick={() => setViewPhoto(delivery.receiptPhoto || null)} className="flex-1 bg-slate-50 text-slate-500 p-3 rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase border border-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-all">
                        <ImageIcon className="w-4 h-4" /> Ver Comprovante
                      </button>
                    )}
                    {loggedRole === 'ADMIN' && (
                      <button onClick={() => setDeliveries(prev => prev.filter(d => d.id !== delivery.id))} className="p-3 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              );
            })}
            {((activeView === 'DRIVER_PORTAL' ? driversOrders : filteredDeliveries).length === 0) && (
              <div className="col-span-full py-20 text-center opacity-30">
                 <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Sem resultados para exibição</p>
              </div>
            )}
          </div>
        )}

        {/* GESTÃO DE CARGAS */}
        {activeView === 'LOADS_MGMT' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 gap-4">
              {loads.length === 0 ? (
                <div className="py-20 text-center opacity-30 bg-white rounded-3xl border border-dashed border-slate-300">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Nenhuma carga cadastrada</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-2">Importe uma planilha no Painel Geral para criar uma carga.</p>
                </div>
              ) : (() => {
                const filteredLoads = loads
                  .filter(l => 
                    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    l.driverName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                if (filteredLoads.length === 0) {
                  return (
                    <div className="py-20 text-center opacity-30 bg-white rounded-3xl border border-dashed border-slate-300">
                      <Search className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Nenhuma carga encontrada</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-2">Tente buscar por outro nome ou motorista.</p>
                    </div>
                  );
                }

                return filteredLoads.map(load => {
                  const loadDeliveries = deliveries.filter(d => d.loadId === load.id);
                  const deliveredCount = loadDeliveries.filter(d => d.status === DeliveryStatus.DELIVERED).count || loadDeliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
                  const totalCount = loadDeliveries.length;
                  const progress = totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0;

                  return (
                    <div key={load.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <Package className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight leading-none mb-2">{load.name}</h3>
                            <div className="flex flex-wrap gap-3">
                              <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg flex items-center gap-1 uppercase">
                                <User className="w-3 h-3" /> {load.driverName}
                              </span>
                              <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg flex items-center gap-1 uppercase">
                                <RotateCcw className="w-3 h-3" /> Coleta: {new Date(load.pickupDate).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-2 py-1 rounded-lg flex items-center gap-1 uppercase">
                                <Navigation className="w-3 h-3" /> Saída: {new Date(load.departureDate).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Progresso</p>
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                              </div>
                              <span className="text-xs font-black text-slate-900">{deliveredCount}/{totalCount}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setExpandedLoadId(expandedLoadId === load.id ? null : load.id)}
                              className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"
                            >
                              {expandedLoadId === load.id ? <X className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            {loggedRole === 'ADMIN' && (
                              <button 
                                onClick={() => {
                                  if (window.confirm(`Deseja excluir a carga ${load.name} e todos os seus pedidos?`)) {
                                    setLoads(prev => prev.filter(l => l.id !== load.id));
                                    setDeliveries(prev => prev.filter(d => d.loadId !== load.id));
                                  }
                                }}
                                className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 active:scale-95 transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedLoadId === load.id && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {loadDeliveries.map(delivery => (
                              <div key={delivery.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-mono text-blue-600 font-black text-[10px]">#{delivery.orderNumber}</span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest border ${
                                      delivery.status === DeliveryStatus.DELIVERED ? 'bg-green-50 text-green-700 border-green-200' :
                                      delivery.status === DeliveryStatus.IN_TRANSIT ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      delivery.status === DeliveryStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}>
                                      {delivery.status}
                                    </span>
                                  </div>
                                  <h4 className="font-black text-slate-900 text-xs uppercase mb-1 truncate">{delivery.customerName}</h4>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{delivery.city}</p>
                                </div>
                                {delivery.receiptPhoto && (
                                  <button onClick={() => setViewPhoto(delivery.receiptPhoto || null)} className="mt-3 w-full bg-slate-50 text-slate-500 py-2 rounded-xl flex items-center justify-center gap-2 font-black text-[8px] uppercase border border-slate-100">
                                    <ImageIcon className="w-3 h-3" /> Ver Foto
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* GESTÃO DE MOTORISTAS (Apenas ADMIN) */}
        {activeView === 'DRIVERS_MGMT' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Form de Cadastro - No topo no mobile */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-600" /> Cadastrar Novo Motorista
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold">Defina as credenciais de acesso.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Roberto Mendes"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Senha de Acesso</label>
                  <input 
                    type="text" 
                    placeholder="Mínimo 3 caracteres"
                    value={newDriverPass}
                    onChange={(e) => setNewDriverPass(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs"
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!newDriverName.trim() || !newDriverPass.trim()) return;
                  setDrivers(prev => [...prev, { id: crypto.randomUUID(), name: newDriverName.trim(), password: newDriverPass.trim() }]);
                  setNewDriverName(''); setNewDriverPass('');
                  setAiMessage("Motorista cadastrado com sucesso!");
                  setTimeout(() => setAiMessage(''), 3000);
                }} 
                className="w-full bg-slate-900 text-white font-black py-5 rounded-xl uppercase text-[11px] shadow-lg hover:bg-slate-800 transition-all active:scale-95 border-b-4 border-slate-950"
              >
                Ativar Novo Motorista
              </button>
            </div>
            
            {/* Lista de Motoristas */}
            <div className="space-y-3">
              <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest px-2">Motoristas Ativos ({drivers.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {drivers.map(driver => (
                  <div key={driver.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{driver.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Senha: {driver.password}</p>
                      </div>
                    </div>
                    <button onClick={() => setDrivers(prev => prev.filter(d => d.id !== driver.id))} className="p-3 text-slate-200 hover:text-red-500 transition-colors bg-slate-50 rounded-xl group-hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAIS */}
        {photoModal && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 space-y-6 shadow-2xl">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Finalizar Entrega</h3>
                <p className="text-[10px] text-slate-500 uppercase font-black">Cliente: {photoModal.customer}</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase text-[10px] shadow-lg active:scale-95">Capturar Comprovante</button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
              <button onClick={() => setPhotoModal(null)} className="w-full text-slate-400 font-black py-2 uppercase text-[9px]">Cancelar</button>
            </div>
          </div>
        )}

        {rejectionModal && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 space-y-6 shadow-2xl">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Devolver Entrega</h3>
                <p className="text-[10px] text-slate-500 uppercase font-black">Cliente: {rejectionModal.customer}</p>
              </div>
              <p className="text-xs text-slate-500 text-center font-medium">Confirma a devolução deste pedido? O status será alterado para DEVOLVIDO.</p>
              <div className="flex gap-3">
                <button onClick={() => setRejectionModal(null)} className="flex-1 py-3 text-[9px] font-black text-slate-400 uppercase">Cancelar</button>
                <button 
                  onClick={() => {
                    setDeliveries(prev => prev.map(d => 
                      d.id === rejectionModal.id ? { ...d, status: DeliveryStatus.REJECTED, updatedAt: new Date().toISOString() } : d
                    ));
                    setRejectionModal(null);
                    setAiMessage("Entrega marcada como devolvida.");
                    setTimeout(() => setAiMessage(null), 3000);
                  }}
                  className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {viewPhoto && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-lg z-[200] flex items-center justify-center p-4" onClick={() => setViewPhoto(null)}>
            <div className="relative max-md:mt-10 max-w-md w-full animate-in zoom-in-95 duration-200">
              <button onClick={() => setViewPhoto(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black text-[11px] uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full"><X className="w-5 h-5" /> Fechar</button>
              <img src={viewPhoto} alt="Comprovante" className="w-full rounded-2xl shadow-2xl border-4 border-white/20" />
            </div>
          </div>
        )}

        {pendingImport && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 space-y-6 shadow-2xl">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Configurar Nova Carga</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total de {pendingImport.length} pedidos importados</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Identificação da Carga</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Carga #001 - Belém"
                    value={loadName}
                    onChange={(e) => setLoadName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Data Coleta</label>
                    <input 
                      type="date" 
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-[10px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Data Saída</label>
                    <input 
                      type="date" 
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-[10px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Selecionar Motorista</label>
                  <select 
                    value={importDriverId} 
                    onChange={(e) => setImportDriverId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs appearance-none"
                  >
                    <option value="">Escolha o motorista...</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setPendingImport(null); setLoadName(''); }} className="flex-1 py-3 text-[9px] font-black text-slate-400 uppercase">Cancelar</button>
                <button 
                  onClick={confirmImport} 
                  disabled={!importDriverId || !loadName.trim()}
                  className="flex-1 bg-blue-600 disabled:bg-slate-200 text-white font-black py-4 rounded-xl uppercase text-[10px] shadow-lg active:scale-95 transition-all"
                >
                  Confirmar Carga
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[100]">
             <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-slate-900 tracking-widest uppercase text-[9px]">Processando dados...</p>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
