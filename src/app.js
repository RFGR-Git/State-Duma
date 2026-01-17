import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  Home as HomeIcon,
  Users,
  Briefcase,
  GitPullRequest,
  ChevronsUp,
  User,
  Calendar,
  Layers,
  Info,
  Search,
  Gavel,
  CheckCircle,
  XCircle,
  FileBadge,
  X as XIcon,
  MinusCircle,
  UserX,
  Plus,
  ChevronDown,
  Lock,
  Edit,
  Trash2,
  ListPlus,
  ArrowRight,
  ListFilter
} from 'lucide-react';

// Main App component that manages the state and renders the correct page
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedBill, setSelectedBill] = useState(null); // State to hold the bill data for the modal
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [appId, setAppId] = useState(null);
  const [bills, setBills] = useState([]);
  const [representatives, setRepresentatives] = useState([]);
  const [leadership, setLeadership] = useState({});
  const [hasAnimated, setHasAnimated] = useState(false);

  // App-level Duma agenda (order of business) shared between Admin and Activity pages
  const [agenda, setAgenda] = useState([]);

  // No default representatives - admin controls the total number

  // Ensure initial leadership default (if you keep leadershipData variable, you can set from that)
  useEffect(() => {
    // if leadership not set, keep as-is (or set defaults here)
  }, []);

  // Set animation flag after component mounts to prevent multiple animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAnimated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Minimal mock data to prevent ReferenceError when Admin/Duma pages render.
  // Kept small and safe; you can replace with richer objects or load from DB later.
  const mockBills = [
    {
      id: 'B-001',
      title: 'Example Budget Amendment',
      status: 'submitted',
      type: 'Finance',
      date: '2025-01-01',
      latestAction: 'Introduced',
      sponsor: 'Rep. Example',
      documentLink: '',
      vote: { ayes: [], nays: [], abstain: [], absent: [] }
    }
  ];



  const leadershipData = {
    speaker: {
      role: 'Duma Speaker',
      name: 'V. Example',
      party: 'United Russia',
      image: '',
      bio: 'Speaker of the Duma (sample data).'
    },
    majorityLeader: {
      role: 'Majority Leader',
      name: 'M. Example',
      party: 'United Russia',
      image: '',
      bio: 'Majority leader (sample data).'
    },
    minorityLeader: {
      role: 'Minority Leader',
      name: 'A. Example',
      party: 'Independent',
      image: '',
      bio: 'Minority leader (sample data).'
    }
  };

  // Initialize Firebase and set up auth/firestore listeners
  useEffect(() => {
    async function initFirebase() {
      // Wait for the firebase config to be loaded
      let attempts = 0;
      const maxAttempts = 10;
      
      while (typeof window.__firebase_config === 'undefined' && attempts < maxAttempts) {
        console.log(`Waiting for Firebase config... attempt ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      // Use the global __firebase_config variable to initialize Firebase
      console.log('Window object:', window);
      console.log('__firebase_config exists:', typeof window.__firebase_config !== 'undefined');
      console.log('__firebase_config value:', window.__firebase_config);
      
      const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : {};
      const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;

      console.log('Firebase config:', firebaseConfig);
      console.log('Config keys length:', Object.keys(firebaseConfig).length);

      if (Object.keys(firebaseConfig).length) {
        const app = initializeApp(firebaseConfig);
        // make sure __app_id is available for other effects (use projectId if not provided)
        try {
          const resolvedAppId = app?.options?.projectId || app?.options?.appId || (typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id');
          // set global and state so other code uses the same id
          window.__app_id = resolvedAppId;
          setAppId(resolvedAppId);
        } catch (e) {
          console.warn('Could not set global __app_id', e);
        }

        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestoreDb);
        setAuth(firebaseAuth);

        const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
          if (user) {
            setUserId(user.uid);
            setIsAuthReady(true);
          } else {
            try {
              if (initialAuthToken) {
                await signInWithCustomToken(firebaseAuth, initialAuthToken);
              } else {
                await signInAnonymously(firebaseAuth);
              }
            } catch (error) {
              console.error("Firebase sign-in failed:", error);
            }
          }
        });
        return () => unsubscribeAuth();
      }
    }
    initFirebase();
  }, []);

  // Firestore data listeners
  useEffect(() => {
    // wait for db, user and resolved appId
    if (db && userId && appId) {
      const billsCol = collection(db, `artifacts/${appId}/public/data/bills`);
      const repsCol = collection(db, `artifacts/${appId}/public/data/representatives`);
      const leadersCol = collection(db, `artifacts/${appId}/public/data/leadership`);
      const agendaCol = collection(db, `artifacts/${appId}/public/data/agenda`);

      const unsubscribeBills = onSnapshot(billsCol, (snapshot) => {
        const fetchedBills = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setBills(fetchedBills);
      }, (err) => console.error('Bills snapshot error', err));

      const unsubscribeReps = onSnapshot(repsCol, (snapshot) => {
        const fetchedReps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setRepresentatives(fetchedReps);
      }, (err) => console.error('Representatives snapshot error', err));

      const unsubscribeLeaders = onSnapshot(leadersCol, (snapshot) => {
        const fetchedLeaders = {};
        snapshot.docs.forEach(d => { fetchedLeaders[d.id] = d.data(); });
        setLeadership(fetchedLeaders);
      }, (err) => console.error('Leadership snapshot error', err));

      const unsubscribeAgenda = onSnapshot(agendaCol, (snapshot) => {
        const fetchedAgenda = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAgenda(fetchedAgenda);
      }, (err) => console.error('Agenda snapshot error', err));

      return () => {
        unsubscribeBills();
        unsubscribeReps();
        unsubscribeLeaders();
        unsubscribeAgenda();
      };
    }
  }, [db, userId, appId]);




  // Function to get party color based on party name
  const getPartyColorClass = (party) => {
    switch (party) {
      case 'United Russia':
        return 'bg-red-500 text-white';
      case 'Russia of the Future':
        return 'bg-blue-500 text-white';
      case 'Independent':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  // Function to get status color based on status
  const getStatusColorClass = (status) => {
    switch (status) {
      case 'submitted': return 'bg-gray-500';
      case 'scheduled': return 'bg-blue-500';
      case 'in debate': return 'bg-indigo-500';
      case 'amended': return 'bg-purple-500';
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'postponed': return 'bg-yellow-500';
      case 'sent to president': return 'bg-teal-500';
      case 'withdrawn': return 'bg-gray-400';
      case 'first hearing': return 'bg-cyan-500';
      case 'second hearing': return 'bg-orange-500';
      case 'third hearing': return 'bg-pink-500';
      case 'enacted': return 'bg-emerald-600';
      case 'vetoed': return 'bg-red-600';
      case 'override won': return 'bg-green-600';
      case 'override lost': return 'bg-red-700';
      case 'refiled': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };
  
  // Status color mapping for admin list
  const getAdminStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-gray-500/20 text-gray-500';
      case 'scheduled': return 'bg-blue-500/20 text-blue-500';
      case 'in debate': return 'bg-indigo-500/20 text-indigo-500';
      case 'amended': return 'bg-purple-500/20 text-purple-500';
      case 'passed': return 'bg-green-500/20 text-green-500';
      case 'failed': return 'bg-red-500/20 text-red-500';
      case 'postponed': return 'bg-yellow-500/20 text-yellow-500';
      case 'sent to president': return 'bg-teal-500/20 text-teal-500';
      case 'withdrawn': return 'bg-gray-400/20 text-gray-400';
      case 'first hearing': return 'bg-cyan-500/20 text-cyan-500';
      case 'second hearing': return 'bg-orange-500/20 text-orange-500';
      case 'third hearing': return 'bg-pink-500/20 text-pink-500';
      case 'enacted': return 'bg-emerald-600/20 text-emerald-600';
      case 'vetoed': return 'bg-red-600/20 text-red-600';
      case 'override won': return 'bg-green-600/20 text-green-600';
      case 'override lost': return 'bg-red-700/20 text-red-700';
      case 'refiled': return 'bg-blue-600/20 text-blue-600';
      default: return 'bg-gray-600/20 text-gray-600';
    }
  };


  // Components for each page
  const Home = () => {
    const [isDumaExplainedOpen, setIsDumaExplainedOpen] = useState(false);
    const steps = [
      {
        title: "Bill Introduction",
        description: "A legislator or government body formally presents a proposed law. The bill is assigned a number and enters the legislative system."
      },
      {
        title: "First Reading",
        description: "The bill's title and general purpose are presented. Members debate its overall concept."
      },
      {
        title: "Second Reading",
        description: "Detailed examination occurs. Members discuss the bill's specific provisions, propose amendments, and vote on them."
      },
      {
        title: "Third Reading",
        description: "Final review and debate. No further amendments are allowed, and legislators vote on whether to pass the bill in its final form."
      },
      {
        title: "Presidential Signing",
        description: "If the legislature passes the bill, it goes to the president for approval. The president can sign it into law or veto it."
      },
      {
        title: "Published as Law",
        description: "Once signed, the law is officially published and becomes enforceable, entering the legal system for implementation."
      }
    ];
    const [currentStep, setCurrentStep] = useState(0);

    return (
      <div className="flex flex-col items-center">
        {/* Hero Section */}
        <div className="w-full relative py-16 sm:py-24 md:py-32 overflow-hidden rounded-b-[2rem] sm:rounded-b-[4rem] shadow-2xl z-0 mb-12 sm:mb-16">
          <div className="absolute inset-0 bg-[url('./homepagebanner.jpg')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1F44] via-[#2979FF] to-[#FFD700] opacity-60"></div>
          <div className="relative z-10 container mx-auto text-center px-4 sm:px-6">
            <h1 className={`text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-white font-extrabold tracking-wide uppercase leading-tight ${hasAnimated ? 'animate-fade-in-up' : ''}`}>
              State Duma <br className="hidden sm:block" /> of the Russian Federation
            </h1>
            <p className={`mt-4 sm:mt-6 text-lg sm:text-xl md:text-2xl text-white/80 leading-relaxed max-w-2xl mx-auto px-4 ${hasAnimated ? 'animate-fade-in' : ''}`} style={{ animationDelay: hasAnimated ? '0.5s' : '0s' }}>
              The legislative authority of the Russian Federation.
            </p>
          </div>
        </div>

        {/* Duma Explained Section */}
        <div className="w-full max-w-7xl px-4 sm:px-6 mb-12 sm:mb-16">
          <div className="bg-[#111827] p-6 sm:p-8 md:p-12 rounded-[1rem] sm:rounded-[2rem] shadow-xl border border-white/10 transition-transform duration-500 hover:scale-[1.005]">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setIsDumaExplainedOpen(!isDumaExplainedOpen)}
            >
              <h2 className="text-2xl sm:text-3xl font-bold tracking-wide uppercase text-white flex items-center">
                <Info className="inline-block mr-2 sm:mr-3 text-[#2979FF]" size={24} /> The Duma Explained
              </h2>
              <ChevronDown
                className={`text-[#FFD700] transition-transform duration-300 ${isDumaExplainedOpen ? 'rotate-180' : ''}`}
                size={28}
              />
            </div>
            {isDumaExplainedOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-6 sm:mt-8 text-left animate-fade-in-down">
                {/* Deputies' Job */}
                <div className="bg-[#0A1F44] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-inner border border-[#2979FF]/20 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-[#FFD700] mb-3 flex items-center">
                    <User className="mr-2 text-[#2979FF]" size={20} /> Job of Deputies
                  </h3>
                  <p className="text-[#94A3B8] leading-relaxed text-sm">Deputies serve as the legislative representatives of the Russian people. Their primary roles include initiating and voting on federal laws, approving the appointment of the Prime Minister, overseeing the government's work, and representing their constituents' interests at the national level. They work within parliamentary committees and factions to debate and shape policy.</p>
                </div>
                {/* Election Process */}
                <div className="bg-[#0A1F44] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-inner border border-[#2979FF]/20 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-[#FFD700] mb-3 flex items-center">
                    <Users className="mr-2 text-[#2979FF]" size={20} /> How They Are Elected
                  </h3>
                  <p className="text-[#94A3B8] leading-relaxed text-sm">There are 15 deputies in the State Duma. They are elected based on campaign points and direct votes, combined into a percentage against their opponent. The candidate with the highest percentage wins the seat.</p>
                </div>
                {/* Duma Rules */}
                <div className="bg-[#0A1F44] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-inner border border-[#2979FF]/20 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-[#FFD700] mb-3 flex items-center">
                    <Layers className="mr-2 text-[#2979FF]" size={20} /> State Duma Rules
                  </h3>
                  <p className="text-[#94A3B8] leading-relaxed text-sm">State Duma rules play a vital part in the organization and functioning of the State Duma.</p>
                  <a href="https://docs.google.com/document/d/1KlmwV8XzArt008LcR2Vn2emy6NDYIAamYjab4QO-MSs/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center text-[#2979FF] hover:text-[#FFD700] transition-colors duration-200">
                    View Document <ArrowRight size={16} className="ml-2" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legislative Process Section - Timeline with Slider */}
        <div id="timeline" className="w-full max-w-7xl px-4 sm:px-6 mb-12 sm:mb-16">
          <div className="bg-[#111827] p-6 sm:p-8 md:p-12 rounded-[1rem] sm:rounded-[2rem] shadow-xl border border-white/10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-wide uppercase text-white text-center mb-8 sm:mb-12 flex items-center justify-center">
              <Gavel className="inline-block mr-2 sm:mr-3 text-[#2979FF]" size={24} /> The Journey of Legislation
            </h2>
            
            {/* Timeline steps */}
            <div className="relative flex justify-between items-start mb-8 sm:mb-10">
              <div className="absolute w-full h-1 bg-[#0A1F44] left-0" style={{ top: '24px' }}>
                <div className="h-full bg-gradient-to-r from-[#2979FF] to-[#FFD700] transition-all duration-300" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}></div>
              </div>
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center justify-start flex-1 text-center relative z-10">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${currentStep >= index ? 'border-[#FFD700] bg-[#2979FF]' : 'border-[#0A1F44] bg-[#0A1F44]'}`}>
                    {currentStep >= index && <CheckCircle className="text-white" size={16} />}
                  </div>
                  <p className={`mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-medium leading-tight max-w-[80px] sm:max-w-[100px] transition-colors duration-300 ${currentStep >= index ? 'text-white' : 'text-[#64748B]'}`}>
                    {step.title}
                  </p>
                </div>
              ))}
            </div>

            {/* Slider control */}
            <div className="w-full flex justify-center mt-6 sm:mt-8 mb-4 sm:mb-6">
                <input
                    type="range"
                    min="0"
                    max={steps.length - 1}
                    value={currentStep}
                    onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                    className="w-full max-w-md"
                />
            </div>

            {/* Current step description */}
            <div className="text-center animate-fade-in">
              <h3 className="text-xl sm:text-2xl font-bold text-[#FFD700] mb-3">{steps[currentStep].title}</h3>
              <p className="text-[#94A3B8] leading-relaxed text-sm sm:text-base max-w-2xl mx-auto px-4">{steps[currentStep].description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Representatives = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState({ type: 'all', value: 'All' });
    const filters = {
      Parties: ['All', 'United Russia', 'Russia of the Future', 'Independent'],
      Regions: ['All', 'Volga Valley', 'Northern Frontier', 'Caucasia', 'Central Steppes', 'Siberian Frontier', 'Outer Mongolia']
    };

    // Filter representatives based on search and filter criteria
    const filteredRepresentatives = (representatives || [])
      .filter(rep => rep.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(rep => {
        if (selectedFilter.value === 'All') return true;
        const filterKey = selectedFilter.type === 'parties' ? 'party' : 'region';
        return rep[filterKey] === selectedFilter.value;
      });

    return (
      <div className="p-4 sm:p-8">
        {/* Banner Image */}
        <div className="w-full h-48 sm:h-64 md:h-80 relative overflow-hidden rounded-b-[2rem] sm:rounded-b-[4rem] shadow-2xl z-0 mb-8 sm:mb-12">
          <div className="absolute inset-0 bg-[url('./reppagebanner.jpg')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1F44] via-[#2979FF] to-[#FFD700] opacity-60"></div>
          <div className="relative z-10 flex items-center justify-center h-full px-4">
            <h1 className="text-3xl sm:text-4xl md:text-6xl text-white font-extrabold tracking-wide uppercase text-center animate-fade-in-up">
              Directory of Representatives
            </h1>
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto">
          {/* Search and Filter */}
          <div className="bg-[#111827] p-4 sm:p-6 rounded-2xl shadow-lg mb-6 sm:mb-8 border border-white/10">

            <div className="flex flex-col space-y-4">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={20} />
                <input
                  type="text"
                  placeholder="SEARCH REPRESENTATIVES..."
                  className="w-full pl-12 pr-4 py-3 bg-[#0A1F44] text-white rounded-full focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B] font-mono"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative w-full">
                <select
                  onChange={(e) => {
                    const [type, value] = e.target.value.split(':');
                    setSelectedFilter({ type: type, value: value });
                  }}
                  className="w-full px-4 py-3 bg-[#0A1F44] text-white rounded-full appearance-none focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner"
                >
                  <option value="all:All">Filter by Party or Region</option>
                  {Object.keys(filters).map(filterType => (
                    <optgroup key={filterType} label={filterType}>
                      {filters[filterType].map(option => (
                        <option key={option} value={`${filterType.toLowerCase()}:${option}`}>
                          {option}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Representatives Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in-up">
            {filteredRepresentatives.length > 0 ? (
              filteredRepresentatives.map((rep, index) => (
                <div
                  key={index}
                  className="bg-[#0A1F44] p-6 rounded-2xl shadow-lg border border-[#2979FF]/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-[#FFD700]"
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className={`relative w-24 h-24 rounded-full bg-[#111827] flex items-center justify-center border-4 shadow-md overflow-hidden ${rep.party === 'United Russia' ? 'border-red-500' : rep.party === 'Russia of the Future' ? 'border-blue-500' : 'border-purple-500'}`}>
                      {rep.image ? (
                        <img src={rep.image} alt={rep.name} className="w-full h-full object-cover" />
                      ) : (
                        // placeholder filled circle when no image
                        <img src={`https://placehold.co/400x400/0A1F44/FFD700?text=${encodeURIComponent(rep.name.split(' ')[1] || rep.name.charAt(0))}`} alt="placeholder" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="flex flex-col items-center justify-center">
                        <h2 className="text-xl font-bold tracking-wide uppercase text-white mb-2">{rep.name}</h2>
                        {/* leadership badge if any leadership entry references this rep id */}
                        {Object.values(leadership || {}).map((ldr) => ldr?.repId === rep.id ? (
                          <span key={ldr.role || ldr.name} className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#FFD700] text-[#0A1F44] uppercase mb-2">
                            {ldr.role || 'Leader'}
                          </span>
                        ) : null)}
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full mt-2 inline-block ${rep.party === 'United Russia' ? 'bg-red-500 text-white' : rep.party === 'Russia of the Future' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                        {rep.party}
                      </span>
                      <p className="text-[#94A3B8] text-sm mt-1">{rep.region}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center text-[#94A3B8] p-8">
                <p>No representatives found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Leadership = () => {
    // Helper function to get representative data by ID
    const getRepById = (repId) => {
      return representatives.find(rep => rep.id === repId);
    };

    // Helper function to get region for leadership member
    const getLeadershipRegion = (leadershipMember) => {
      if (!leadershipMember?.repId) return 'N/A';
      const rep = getRepById(leadershipMember.repId);
      return rep?.region || 'N/A';
    };

    return (
      <div className="p-4 sm:p-8">
        {/* Banner Image */}
        <div className="w-full h-48 sm:h-64 md:h-80 relative overflow-hidden rounded-b-[2rem] sm:rounded-b-[4rem] shadow-2xl z-0 mb-8 sm:mb-12">
          <div className="absolute inset-0 bg-[url('./leadershippagebanner.jpg')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1F44] via-[#2979FF] to-[#FFD700] opacity-60"></div>
          <div className="relative z-10 flex items-center justify-center h-full px-4">
            <h1 className="text-3xl sm:text-4xl md:text-6xl text-white font-extrabold tracking-wide uppercase text-center animate-fade-in-up">
              Leadership of the Duma
            </h1>
          </div>
        </div>
        
        <div className="w-full max-w-7xl mx-auto">
          {/* Leadership Cards - Responsive Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in-up">
            <div className="flex justify-center items-stretch">
                <div className="bg-[#0A1F44] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl border border-[#2979FF]/20 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-[#FFD700] w-full">
                    <img
                      src={leadership.majorityLeader?.image || 'https://placehold.co/400x400/0A1F44/FFD700?text=DM'}
                      alt={leadership.majorityLeader?.name || 'Majority Leader'}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mb-3 sm:mb-4 border-4 border-[#FFD700] shadow-lg"
                    />
                    <h3 className="text-base sm:text-lg font-bold tracking-wide uppercase text-[#2979FF]">{leadership.majorityLeader?.role || 'Majority Leader'}</h3>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{leadership.majorityLeader?.name || 'N/A'}</h2>
                    <span className={`px-2 py-1 text-xs sm:text-sm font-semibold rounded-full ${getPartyColorClass(leadership.majorityLeader?.party)}`}>
                      {leadership.majorityLeader?.party || 'N/A'}
                    </span>
                    <p className="text-[#94A3B8] text-xs sm:text-sm mt-1">{getLeadershipRegion(leadership.majorityLeader)}</p>
                </div>
            </div>
            <div className="flex justify-center items-stretch">
                <div className="bg-[#0A1F44] p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-xl border border-[#2979FF]/20 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-[#FFD700] w-full">
                    <img
                      src={leadership.speaker?.image || 'https://placehold.co/400x400/0A1F44/2979FF?text=VV'}
                      alt={leadership.speaker?.name || 'Duma Speaker'}
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover mb-4 sm:mb-6 border-4 border-[#2979FF] shadow-lg"
                    />
                    <h3 className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-[#FFD700]">{leadership.speaker?.role || 'Duma Speaker'}</h3>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{leadership.speaker?.name || 'N/A'}</h2>
                    <span className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${getPartyColorClass(leadership.speaker?.party)}`}>
                      {leadership.speaker?.party || 'N/A'}
                    </span>
                    <p className="text-[#94A3B8] text-xs sm:text-sm mt-1">{getLeadershipRegion(leadership.speaker)}</p>
                </div>
            </div>
            <div className="flex justify-center items-stretch sm:col-span-2 lg:col-span-1">
                <div className="bg-[#0A1F44] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl border border-[#2979FF]/20 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-[#FFD700] w-full">
                    <img
                      src={leadership.minorityLeader?.image || 'https://placehold.co/400x400/0A1F44/2979FF?text=GZ'}
                      alt={leadership.minorityLeader?.name || 'Minority Leader'}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mb-3 sm:mb-4 border-4 border-[#FFD700] shadow-lg"
                    />
                    <h3 className="text-base sm:text-lg font-bold tracking-wide uppercase text-[#2979FF]">{leadership.minorityLeader?.role || 'Minority Leader'}</h3>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{leadership.minorityLeader?.name || 'N/A'}</h2>
                    <span className={`px-2 py-1 text-xs sm:text-sm font-semibold rounded-full ${getPartyColorClass(leadership.minorityLeader?.party)}`}>
                      {leadership.minorityLeader?.party || 'N/A'}
                    </span>
                    <p className="text-[#94A3B8] text-xs sm:text-sm mt-1">{getLeadershipRegion(leadership.minorityLeader)}</p>
                </div>
            </div>
          </div>
          <div className="bg-[#111827] p-6 sm:p-8 md:p-12 rounded-[1rem] sm:rounded-[2rem] shadow-xl border border-white/10 mt-8 sm:mt-12 transition-transform duration-500 hover:scale-[1.005]">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-wide uppercase text-white flex items-center justify-center mb-6">
                <Info className="inline-block mr-2 sm:mr-3 text-[#2979FF]" size={24} /> Understanding Leadership Roles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-6 sm:mt-8">
               <div className="p-4 rounded-xl">
                   <h3 className="text-xl font-bold tracking-wide uppercase text-[#FFD700] mb-2 flex items-center">
                     Duma Speaker
                   </h3>
                   <p className="text-[#94A3B8] leading-relaxed text-sm">
                     The Speaker is elected by the State Duma as a whole. This position presides over sessions, manages the legislative schedule, and represents the chamber in official matters. The Speaker plays a central role in maintaining order during debates and ensuring the passage of laws follows procedure.
                   </p>
               </div>
               <div className="p-4 rounded-xl">
                   <h3 className="text-xl font-bold tracking-wide uppercase text-[#2979FF] mb-2 flex items-center">
                     Majority Leader
                   </h3>
                   <p className="text-[#94A3B8] leading-relaxed text-sm">
                     The Majority Leader is chosen by the faction holding the largest number of seats. This leader organizes the legislative priorities of the majority, guides bills through debates and votes, and acts as the main spokesperson of the dominant faction.
                   </p>
               </div>
               <div className="p-4 rounded-xl">
                   <h3 className="text-xl font-bold tracking-wide uppercase text-[#2979FF] mb-2 flex items-center">
                     Minority Leader
                   </h3>
                   <p className="text-[#94A3B8] leading-relaxed text-sm">
                     The Minority Leader is elected by the largest opposition faction. Their role is to coordinate the positions of opposition members, present alternatives to government proposals, and ensure that dissenting voices in the Duma are represented effectively.
                   </p>
               </div>
             </div>
           </div>
         </div>
      </div>
    );
  };

  const LegislativeActivity = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [modalBill, setModalBill] = useState(null);
    const [showAgendaModal, setShowAgendaModal] = useState(false);
    const [selectedAgenda, setSelectedAgenda] = useState(null);

    // New filter states
    const [filterType, setFilterType] = useState('All');
    // empty string = All dates; input[type="date"] returns YYYY-MM-DD
    const [filterDate, setFilterDate] = useState('');
    const [filterSponsor, setFilterSponsor] = useState('All');

    // Get unique values for filters
    const billTypes = ['All', ...Array.from(new Set(bills.map(b => b.type).filter(Boolean)))];
    // billDates removed — we use an open date picker instead
    // Sponsor list should include all representatives (even if they haven't sponsored)
    const billSponsors = ['All', ...Array.from(new Set((representatives || []).map(r => r.name).filter(Boolean)))];

    // Filter logic: exclude final statuses from activity view unless user is searching
    const excludedStatuses = new Set(['enacted','failed','override won','override lost']);
    const filteredBills = bills
      .filter(bill => {
        // title match
        const matchesTitle = bill.title.toLowerCase().includes(searchTerm.toLowerCase());
        // if user is searching allow all statuses; otherwise hide excluded final statuses
        const visibleByStatus = searchTerm.trim() ? true : !excludedStatuses.has((bill.status || '').toLowerCase());
        return matchesTitle && visibleByStatus;
      })
      .filter(bill => filterType === 'All' || bill.type === filterType)
      .filter(bill => (!filterDate || filterDate === '') || bill.date === filterDate)
      .filter(bill => {
        if (filterSponsor === 'All') return true;
        const normalize = s => (s || '').toString().replace(/^Rep\.\s*/i, '').trim().toLowerCase();
        return normalize(bill.sponsor) === normalize(filterSponsor);
      });

    // Status color mapping for badges
    const getStatusBadgeColor = (status) => {
      switch (status) {
        case 'submitted': return 'bg-gray-500 text-white';
        case 'scheduled': return 'bg-blue-500 text-white';
        case 'in debate': return 'bg-indigo-500 text-white';
        case 'amended': return 'bg-purple-500 text-white';
        case 'passed': return 'bg-green-500 text-white';
        case 'enacted': return 'bg-emerald-600 text-white';
        case 'vetoed': return 'bg-red-700 text-white';
        case 'override won': return 'bg-green-700 text-white';
        case 'override lost': return 'bg-red-800 text-white';
        case 'refiled': return 'bg-blue-600 text-white';
        case 'failed': return 'bg-red-500 text-white';
        case 'postponed': return 'bg-yellow-500 text-black';
        case 'sent to president': return 'bg-teal-500 text-white';
        case 'withdrawn': return 'bg-gray-400 text-black';
        case 'first hearing': return 'bg-cyan-500 text-white';
        case 'second hearing': return 'bg-orange-500 text-white';
        case 'third hearing': return 'bg-pink-500 text-white';
        default: return 'bg-gray-600 text-white';
      }
    };

    const StatusBadge = ({ status }) => (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase status-badge ${getStatusBadgeColor(status)}`}>
        {status}
      </span>
    );
  
    const BillModal = ({ bill, onClose }) => {
      const [isVoteInfoOpen, setIsVoteInfoOpen] = useState(false);
      
      if (!bill) return null;

      // Helpers: strip "Rep." prefix and ignore 'N/A' entries
      const stripRep = (s) => (s || '').toString().replace(/^Rep\.\s*/i, '').trim();
      const isValidName = (n) => n && n.toString().trim() && n.toString().trim().toUpperCase() !== 'N/A';

      // Raw arrays from bill but filtered to remove N/A and empty entries
      const ayesRaw = Array.isArray(bill.vote?.ayes) ? bill.vote.ayes.filter(isValidName) : [];
      const naysRaw = Array.isArray(bill.vote?.nays) ? bill.vote.nays.filter(isValidName) : [];
      const abstainRaw = Array.isArray(bill.vote?.abstain) ? bill.vote.abstain.filter(isValidName) : [];
      const storedAbsentRaw = Array.isArray(bill.vote?.absent) ? bill.vote.absent.filter(isValidName) : [];

      // Normalize for comparisons (strip prefix)
      const normalizedAyes = ayesRaw.map(stripRep);
      const normalizedNays = naysRaw.map(stripRep);
      const normalizedAbstain = abstainRaw.map(stripRep);

      // compute absent from representatives (normalized) when explicit absent not provided
      const allRepNamesNormalized = (representatives || []).map(r => stripRep(r.name));
      const absentComputed = allRepNamesNormalized.filter(name =>
        !normalizedAyes.some(a => a.toLowerCase() === name.toLowerCase()) &&
        !normalizedNays.some(a => a.toLowerCase() === name.toLowerCase()) &&
        !normalizedAbstain.some(a => a.toLowerCase() === name.toLowerCase())
      );

      const absentRawNormalized = (storedAbsentRaw.length ? storedAbsentRaw.map(stripRep) : absentComputed);

      // counts use filtered/raw arrays (already excluded N/A)
      const ayesCount = normalizedAyes.length;
      const naysCount = normalizedNays.length;
      const abstainCount = normalizedAbstain.length;
      const absentCount = absentRawNormalized.length;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-70 animate-fade-in-modal">
          <div className="bg-[#0A1F44] text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full animate-scale-in border border-[#2979FF] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-[#FFD700] leading-tight">{bill.title}</h3>
                <p className="font-mono text-[#94A3B8] text-xs sm:text-sm mt-1">{bill.id}</p>
              </div>
              <button onClick={onClose} className="text-[#2979FF] hover:text-white transition-colors duration-200">
                <XIcon size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[50vh] pr-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column Boxes */}
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    <div className="bg-[#111827] p-3 sm:p-4 rounded-xl shadow-inner border border-[#2979FF]/20">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#FFD700] uppercase mb-1">Status</h4>
                      <StatusBadge status={bill.status} />
                    </div>
                    <div className="bg-[#111827] p-3 sm:p-4 rounded-xl shadow-inner border border-[#2979FF]/20">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#FFD700] uppercase mb-1">Date Introduced</h4>
                      <p className="text-[#CBD5E1] text-sm">{bill.date}</p>
                    </div>
                    <div className="bg-[#111827] p-3 sm:p-4 rounded-xl shadow-inner border border-[#2979FF]/20">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#FFD700] uppercase mb-1">Sponsor</h4>
                      <p className="text-[#CBD5E1] text-sm">{bill.sponsor}</p>
                    </div>
                  </div>
                  {/* Right Column Boxes */}
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    <div className="bg-[#111827] p-3 sm:p-4 rounded-xl shadow-inner border border-[#2979FF]/20">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#FFD700] uppercase mb-1">Bill Type</h4>
                      <p className="text-[#CBD5E1] text-sm">{bill.type}</p>
                    </div>
                    <div className="bg-[#111827] p-3 sm:p-4 rounded-xl shadow-inner border border-[#2979FF]/20">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#FFD700] uppercase mb-1">Latest Action</h4>
                      <p className="text-[#CBD5E1] text-sm">{bill.latestAction}</p>
                    </div>
                    <div className="bg-[#111827] p-3 sm:p-4 rounded-xl shadow-inner border border-[#2979FF]/20">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#FFD700] uppercase mb-1">Vote Result</h4>
                      <p className="text-[#CBD5E1] text-sm">
                        {(() => {
                          const hasVoteData = ayesCount > 0 || naysCount > 0 || abstainCount > 0 || absentCount > 0;
                          if (!hasVoteData) return 'Pending';
                          const voteSummary = [];
                          if (ayesCount > 0) voteSummary.push(`AYE: ${ayesCount}`);
                          if (naysCount > 0) voteSummary.push(`NAY: ${naysCount}`);
                          if (abstainCount > 0) voteSummary.push(`ABS: ${abstainCount}`);
                          if (absentCount > 0) voteSummary.push(`ABSENT: ${absentCount}`);
                          return voteSummary.join(', ');
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collapsible Vote Info section */}
                <div className="mt-4 sm:mt-6">
                  <button
                    onClick={() => setIsVoteInfoOpen(!isVoteInfoOpen)}
                    className="w-full py-2 px-3 sm:px-4 rounded-full bg-[#2979FF] text-white font-semibold flex items-center justify-center space-x-2 hover:bg-[#FFD700] hover:text-[#0A1F44] transition-colors duration-200"
                  >
                    <span>View Vote Info</span>
                    <ChevronDown size={16} className={`${isVoteInfoOpen ? 'rotate-180' : ''} transition-transform duration-300`} />
                  </button>
                  {isVoteInfoOpen && (
                    <div className="mt-3 sm:mt-4 bg-[#111827] p-3 sm:p-4 rounded-xl space-y-3 animate-fade-in-down">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* Ayes */}
                        {ayesCount > 0 && (
                          <div className="bg-[#22C55E]/20 p-3 rounded-lg">
                            <h5 className="font-semibold text-[#22C55E] text-sm">Ayes ({ayesCount})</h5>
                            <p className="text-xs text-[#CBD5E1] mt-1">{normalizedAyes.join(', ')}</p>
                          </div>
                        )}
                        {/* Nays */}
                        {naysCount > 0 && (
                          <div className="bg-red-500/20 p-3 rounded-lg">
                            <h5 className="font-semibold text-red-500 text-sm">Nays ({naysCount})</h5>
                            <p className="text-xs text-[#CBD5E1] mt-1">{normalizedNays.join(', ')}</p>
                          </div>
                        )}
                        {/* Abstain */}
                        {abstainCount > 0 && (
                          <div className="bg-yellow-500/20 p-3 rounded-lg">
                            <h5 className="font-semibold text-yellow-500 text-sm">Abstain ({abstainCount})</h5>
                            <p className="text-xs text-[#CBD5E1] mt-1">{normalizedAbstain.join(', ')}</p>
                          </div>
                        )}
                        {/* Absent */}
                        {absentCount > 0 && (
                          <div className="bg-gray-500/20 p-3 rounded-lg">
                            <h5 className="font-semibold text-gray-400 text-sm">Absent ({absentCount})</h5>
                            <p className="text-xs text-[#CBD5E1] mt-1">{absentRawNormalized.join(', ')}</p>
                          </div>
                        )}
                        {/* Show message if no valid vote data */}
                        {!(ayesCount || naysCount || abstainCount || absentCount) && (
                          <div className="col-span-1 sm:col-span-2 text-center py-4">
                            <p className="text-[#94A3B8] text-sm">No vote data available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      );
    };

    const DumaAgenda = () => {
      const [showAgendaModal, setShowAgendaModal] = useState(false);
      const [selectedAgenda, setSelectedAgenda] = useState(null);
    
      const AgendaModal = ({ agenda, onClose }) => {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-70 animate-fade-in-modal">
            <div className="bg-[#0A1F44] text-white p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl animate-scale-in border border-[#2979FF] max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-[#FFD700]">ORDER OF BUSINESS - {agenda.date}</h3>
                <button onClick={onClose} className="text-[#2979FF] hover:text-white transition-colors duration-200">
                  <XIcon size={24} />
                </button>
              </div>
                             <div className="overflow-y-auto max-h-[60vh] pr-2 space-y-4 sm:space-y-6">
                 {agenda.business && agenda.business.map((item, index) => (
                   <div key={index}>
                     <h4 className="font-bold text-base sm:text-lg text-white mb-1">{item.time}: {item.title}</h4>
                     {item.text && (
                       <div 
                         className="text-[#94A3B8] text-sm leading-relaxed"
                         dangerouslySetInnerHTML={{ __html: item.text }}
                       />
                     )}
                     {item.items && item.items.length > 0 && (
                       <div className="mt-3 ml-2 sm:ml-4">
                         <h5 className="font-semibold text-[#FFD700] uppercase text-xs sm:text-sm mb-2">REVIEW OF PROPOSED LEGISLATION</h5>
                         <ul className="list-none space-y-1">
                           {item.items.map((bill, billIndex) => (
                             <li key={billIndex}>
                               <span className="text-[#CBD5E1] font-mono text-xs sm:text-sm">Bill {billIndex + 1}:</span>
                               <span className="text-white ml-2 text-xs sm:text-sm">{bill.name}</span>
                               {bill.details && (
                                 <p className="text-xs text-[#64748B] ml-4 sm:ml-6 italic">{bill.details}</p>
                               )}
                             </li>
                           ))}
                         </ul>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          </div>
        );
      };

      return (
        <div className="bg-[#111827] p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-xl border border-white/10 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-wide uppercase text-[#FFD700] text-center mb-4 sm:mb-6">
            Duma Agenda
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {agenda && agenda.length ? (
              agenda.map((day, index) => (
                <div key={index} className="bg-[#0A1F44] p-3 sm:p-4 rounded-xl shadow-lg border border-[#2979FF]/20">
                  <button
                    onClick={() => {
                      setSelectedAgenda(day);
                      setShowAgendaModal(true);
                    }}
                    className="w-full flex justify-between items-center text-left"
                  >
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                      <Calendar size={18} className="text-[#FFD700] mr-2" />
                      {day.date}
                    </h3>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center text-[#94A3B8] p-6 sm:p-8">No upcoming work.</div>
            )}
          </div>
          {showAgendaModal && selectedAgenda && <AgendaModal agenda={selectedAgenda} onClose={() => setShowAgendaModal(false)} />}
        </div>
      );
    };

    return (
      <div className="p-4 sm:p-8">
        {/* Banner Image */}
        <div className="w-full h-48 sm:h-64 md:h-80 relative overflow-hidden rounded-b-[2rem] sm:rounded-b-[4rem] shadow-2xl z-0 mb-8 sm:mb-12">
          {/* removed image URL to avoid 404 when asset is missing; fallback to gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1F44] via-[#0A1F44] to-[#0A1F44]"></div>
           <div className="absolute inset-0 bg-gradient-to-br from-[#0A1F44] via-[#2979FF] to-[#FFD700] opacity-60"></div>
+          <div className="relative z-10 flex items-center justify-center h-full px-4">
+            <h1 className="text-3xl sm:text-4xl md:text-6xl text-white font-extrabold tracking-wide uppercase text-center animate-fade-in-up">
+              LEGISLATIVE ACTIVITY
+            </h1>
+          </div>
        </div>
        
        <div className="w-full max-w-7xl mx-auto">
          {/* Duma Agenda Section */}
          <DumaAgenda />
          
          {/* Search and Filter Bar */}
          <div className="bg-[#111827] p-4 sm:p-6 rounded-2xl shadow-lg mb-6 sm:mb-8 border border-white/10">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-1/2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={20} />
                <input
                  type="text"
                  placeholder="SEARCH BILL NAME..."
                  className="w-full pl-12 pr-4 py-3 bg-[#0A1F44] text-white rounded-full focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B] font-mono"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-1/2">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-full"
                >
                  {billTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>

                {/* date picker — empty = All */}
                <input
                  type="date"
                  value={filterDate || ''}
                  onChange={e => setFilterDate(e.target.value || '')}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-full"
                />
                <button type="button" onClick={() => setFilterDate('')} className="px-3 py-2 rounded bg-[#64748B] text-white">Clear</button>

                <select
                  value={filterSponsor}
                  onChange={e => setFilterSponsor(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-full"
                >
                  {billSponsors.map(sponsor => <option key={sponsor} value={sponsor}>{sponsor}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Bill List */}
          <div className="bg-[#111827] p-4 sm:p-8 rounded-2xl shadow-xl border border-white/10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-wide uppercase text-[#FFD700] text-center mb-6 sm:mb-8">
              {searchTerm.trim() ? 'SEARCH RESULTS' : 'LEGISLATIVE ACTIVITY'}
            </h2>
            <div className="space-y-4 sm:space-y-6">
              {filteredBills.length > 0 ? (
                filteredBills.map((bill, index) => (
                  <div
                    key={index}
                    onClick={() => setModalBill(bill)}
                    className="bg-[#0A1F44] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-[#2979FF]/20 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-[#FFD700]"
                  >
                    <div className="bill-card-grid">
                      <div className="order-1">
                        <h3 className="text-xl font-bold text-white leading-tight">{bill.title}</h3>
                        <p className="font-mono text-[#94A3B8] text-sm mt-1">{bill.id}</p>
                      </div>
                      <div className="flex justify-end order-2 sm:order-2">
                        {bill.documentLink && (
                          <a
                            href={bill.documentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 bg-[#FFD700] text-[#0A1F44] font-semibold rounded-lg hover:bg-white transition-colors duration-200 shadow-lg min-w-[80px] text-center inline-block"
                          >
                            View
                          </a>
                        )}
                      </div>
                      <div className="flex justify-end order-3 sm:order-3">
                        <StatusBadge status={bill.status} />
                      </div>
                      <div className="flex justify-center order-4 sm:order-4">
                        <span className="font-mono text-[#94A3B8] text-sm date-text">{bill.date}</span>
                      </div>
                    </div>
                  </div>
                ))
              ): (
                <div className="text-center text-[#94A3B8] p-8">
                  <p>{searchTerm.trim() ? 'No bills found matching your search criteria.' : 'No active bills found.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <BillModal bill={modalBill} onClose={() => setModalBill(null)} />
      </div>
    );
  };
  
  const AdminPage = () => {
    // persist admin login across page/tab navigation inside the SPA
    const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('admin_logged_in') === 'true');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [billForm, setBillForm] = useState({
      id: '',
      title: '',
      status: '',
      type: '',
      date: '',
      latestAction: '',
      sponsor: '',
      documentLink: '',
      vote: { ayes: [], nays: [], abstain: [], absent: [] },
      voteText: { ayes: '', nays: '', abstain: '', absent: '' } // raw text for inputs
    });
    const [repForm, setRepForm] = useState({ id: '', name: '', party: '', region: '', image: '', leadershipRole: '' });
    const [leaderForm, setLeaderForm] = useState({ role: '', name: '', party: '', image: '', bio: '' });
    const [isEditingBill, setIsEditingBill] = useState(false);
    const [isEditingRep, setIsEditingRep] = useState(false);
    const [isEditingLeader, setIsEditingLeader] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [agendaFormOpen, setAgendaFormOpen] = useState(false);
    const [editingAgendaIndex, setEditingAgendaIndex] = useState(null);
    const [agendaForm, setAgendaForm] = useState({ date: '', business: [] });

    // <<-- ADD THESE LINES (must appear before any JSX/early returns) -->
    const [repSearchTerm, setRepSearchTerm] = useState('');
    const [repPartyFilter, setRepPartyFilter] = useState('All');

    // Derived filtered list used in the admin table
    const filteredReps = (representatives || [])
      .filter(rep => (rep.name || '').toLowerCase().includes((repSearchTerm || '').toLowerCase()))
      .filter(rep => repPartyFilter === 'All' || rep.party === repPartyFilter);
    // <-- end added lines -->

    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'password';

    const handleLogin = (e) => {
      e.preventDefault();
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        setIsLoggedIn(true);
        try { localStorage.setItem('admin_logged_in', 'true'); } catch(_) {}
      } else {
        setStatusMessage("Invalid credentials.");
      }
    };
    
    // keep localStorage in sync if isLoggedIn changes (handles manual logout if you add that later)
    useEffect(() => {
      try { localStorage.setItem('admin_logged_in', isLoggedIn ? 'true' : 'false'); } catch (_) {}
    }, [isLoggedIn]);

    // Bill management handlers
    const handleBillChange = (e) => {
      const { name, value } = e.target;
      setBillForm(prevState => ({ ...prevState, [name]: value }));
    };

    // <-- ADD: helpers to toggle vote membership and ensure mutual exclusivity -->
    const toggleVoteMember = (repName, category) => {
      setBillForm(prev => {
        // copy existing arrays
        const ayes = Array.isArray(prev.vote.ayes) ? [...prev.vote.ayes] : [];
        const nays = Array.isArray(prev.vote.nays) ? [...prev.vote.nays] : [];
        const abstain = Array.isArray(prev.vote.abstain) ? [...prev.vote.abstain] : [];

        // remove from all first
        const remove = (arr, name) => arr.filter(n => n !== name);
        const nextAyes = remove(ayes, repName);
        const nextNays = remove(nays, repName);
        const nextAbstain = remove(abstain, repName);

        // decide target arrays after toggle
        let finalAyes = nextAyes;
        let finalNays = nextNays;
        let finalAbstain = nextAbstain;

        // if currently not in target, add it
        const currentlyInTarget = (category === 'ayes' ? ayes : category === 'nays' ? nays : abstain).includes(repName);
        if (!currentlyInTarget) {
          if (category === 'ayes') finalAyes = [...nextAyes, repName];
          if (category === 'nays') finalNays = [...nextNays, repName];
          if (category === 'abstain') finalAbstain = [...nextAbstain, repName];
        }

        // compute absent from the current representatives list
        const allRepNames = (representatives || []).map(r => r.name);
        const finalAbsent = allRepNames.filter(name =>
          !finalAyes.includes(name) && !finalNays.includes(name) && !finalAbstain.includes(name)
        );

        return {
          ...prev,
          vote: {
            ayes: finalAyes,
            nays: finalNays,
            abstain: finalAbstain,
            absent: finalAbsent
          }
        };
      });
    };

    const isInVote = (repName, cat) => Array.isArray(billForm.vote?.[cat]) && billForm.vote[cat].includes(repName);
    // <-- end helpers -->

    const handleSubmitBill = async (e) => {
      e.preventDefault();
      // parse voteText into vote arrays (prefer raw text if provided)
      const parsedVote = {
        ayes: billForm.voteText?.ayes ? billForm.voteText.ayes.split(',').map(s => s.trim()).filter(Boolean) : (billForm.vote?.ayes || []),
        nays: billForm.voteText?.nays ? billForm.voteText.nays.split(',').map(s => s.trim()).filter(Boolean) : (billForm.vote?.nays || []),
        abstain: billForm.voteText?.abstain ? billForm.voteText.abstain.split(',').map(s => s.trim()).filter(Boolean) : (billForm.vote?.abstain || []),
        absent: billForm.voteText?.absent ? billForm.voteText.absent.split(',').map(s => s.trim()).filter(Boolean) : (billForm.vote?.absent || [])
      };

      // compute absent if not provided
      if (!Array.isArray(parsedVote.absent) || parsedVote.absent.length === 0) {
        const allRepNames = (representatives || []).map(r => r.name);
        parsedVote.absent = allRepNames.filter(name =>
          !parsedVote.ayes.includes(name) && !parsedVote.nays.includes(name) && !parsedVote.abstain.includes(name)
        );
      }

      const billId = billForm.id && !billForm.id.startsWith('new-') ? billForm.id : `bill-${Date.now()}`;
      const billToSave = { ...billForm, id: billId, vote: parsedVote };
      // remove temporary voteText before saving
      if (billToSave.voteText) delete billToSave.voteText;

      // local update
      if (isEditingBill) {
        setBills(prev => prev.map(b => (b.id === billForm.id ? billToSave : b)));
        setStatusMessage('Bill updated successfully!');
      } else {
        setBills(prev => ([...prev, billToSave]));
        setStatusMessage('Bill added successfully!');
      }
// persist to Firestore when available
try {
  if (db && userId && appId) {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', billId), billToSave);
  } else if (!appId) {
    console.warn('appId not set, skipping bill persist');
  }
} catch (err) {
  console.error('Failed to persist bill to Firestore', err);
  setStatusMessage('Saved locally but failed to persist to database.');
}

// reset form
setBillForm({ id: '', title: '', status: '', type: '', date: '', latestAction: '', sponsor: '', documentLink: '', vote: { ayes: [], nays: [], abstain: [], absent: [] }, voteText: { ayes: '', nays: '', abstain: '', absent: '' } });
setIsEditingBill(false);
    };

    const handleEditBill = (bill) => {
      // when editing populate voteText from existing arrays
      setBillForm({ ...bill, voteText: { ayes: (bill.vote?.ayes || []).join(', '), nays: (bill.vote?.nays || []).join(', '), abstain: (bill.vote?.abstain || []).join(', '), absent: (bill.vote?.absent || []).join(', ') } });
      setIsEditingBill(true);
    };
    
    const handleDeleteBill = async (id) => {
      if (!window.confirm("Are you sure you want to delete this bill?")) return;
      // optimistic UI
      setBills(prev => prev.filter(bill => bill.id !== id));
      setStatusMessage('Bill deleted locally.');
      try {
        if (db && userId && appId) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', id));
          setStatusMessage('Bill deleted successfully!');
        }
      } catch (err) {
        console.error('Failed to delete bill in Firestore', err);
        setStatusMessage('Local delete succeeded but failed to remove from database.');
      }
    };
 
    const handleRepChange = (e) => {
      const { name, value } = e.target;
      setRepForm(prevState => ({ ...prevState, [name]: value }));
    };
    
    const handleSubmitRep = async (e) => {
      e.preventDefault();
      const repId = repForm.id && !repForm.id.startsWith('new-') ? repForm.id : `rep-${Date.now()}`;
      const repData = { ...repForm, id: repId };
// local update UI-first
if (isEditingRep) {
  setRepresentatives(prev => prev.map(r => (r.id === repForm.id ? repData : r)));
  setStatusMessage('Representative updated successfully!');
} else {
  setRepresentatives(prev => ([...prev, repData]));
  setStatusMessage('Representative added successfully!');
}

  // update leadership mapping locally if chosen
  if (repForm.leadershipRole) {
    const key = repForm.leadershipRole;
    const leaderDoc = {
      role: (key === 'speaker' ? 'Duma Speaker' : key === 'majorityLeader' ? 'Majority Leader' : 'Minority Leader'),
      name: repForm.name,
      party: repForm.party,
      image: repForm.image,
      bio: repForm.bio || '',
      repId: repId
    };
    setLeadership(prev => ({ ...prev, [key]: leaderDoc }));
    try {
      if (db && userId && appId) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leadership', key), leaderDoc);
      }
    } catch (err) {
      console.error('Failed to persist leadership to Firestore', err);
      setStatusMessage((s) => (s ? s + ' Leadership save failed.' : 'Leadership save failed.'));
    }
  } else {
    // clear any leadership doc that references this repId
    try {
      if (db && userId && appId) {
        for (const [key, ldr] of Object.entries(leadership || {})) {
          if (ldr?.repId === repId) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leadership', key));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to clean old leadership entries', err);
    }
  }

  // persist representative to the same collection that the listener uses
  try {
    if (db && userId && appId) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'representatives', repId), repData);
    } else if (!appId) {
      console.warn('appId not set, skipping rep persist');
    }
  } catch (err) {
    console.error('Failed to persist representative to Firestore', err);
    setStatusMessage('Saved locally but failed to persist to database.');
  }

  setRepForm({ id: '', name: '', party: '', region: '', image: '', leadershipRole: '' });
  setIsEditingRep(false);
};
 
    const handleEditRep = (rep) => {
      const roleKey = Object.keys(leadership || {}).find(k => leadership[k]?.repId === rep.id) || Object.keys(leadership || {}).find(k => leadership[k]?.name === rep.name) || '';
      setRepForm({ ...rep, leadershipRole: roleKey });
      setIsEditingRep(true);
    };

    const handleDeleteRep = async (id) => {
      if (!window.confirm("Are you sure you want to delete this representative?")) return;
      
      // Find the representative to check if they have a leadership role
      const repToDelete = representatives.find(r => r.id === id);
      
      // Optimistic UI update
      setRepresentatives(prev => prev.filter(rep => rep.id !== id));
      setStatusMessage('Representative deleted locally.');
      
      try {
        if (db && userId && appId) {
          // Delete the representative document
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'representatives', id));
          
          // If they had a leadership role, remove it from leadership collection
          if (repToDelete?.leadershipRole) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leadership', repToDelete.leadershipRole));
            // Update local leadership state
            setLeadership(prev => {
              const newLeadership = { ...prev };
              delete newLeadership[repToDelete.leadershipRole];
              return newLeadership;
            });
          }
          
          setStatusMessage('Representative deleted successfully!');
        }
      } catch (err) {
        console.error('Failed to delete representative in Firestore', err);
        setStatusMessage('Local delete succeeded but failed to remove from database.');
      }
    };
 
    // Agenda management handlers (create / update / delete)
    const openNewAgendaForm = () => {
      setEditingAgendaIndex(null);
      setAgendaForm({ date: '', business: [] });
      setAgendaFormOpen(true);
    };
 
    const handleAgendaItemChange = (idx, field, value) => {
      setAgendaForm(prev => {
        const business = [...prev.business];
        business[idx] = { ...business[idx], [field]: value };
        return { ...prev, business };
      });
    };
 
    const addAgendaItemField = () => setAgendaForm(prev => ({ ...prev, business: [...prev.business, { time: '', title: '', text: '', items: [] }] }));
 
    const removeAgendaItemField = (idx) => setAgendaForm(prev => ({ ...prev, business: prev.business.filter((_, i) => i !== idx) }));
 
    const handleSaveAgenda = async (e) => {
      e.preventDefault();
      const agendaId = agendaForm.id && !agendaForm.id.startsWith('new-') ? agendaForm.id : `agenda-${Date.now()}`;
      const agendaDoc = { ...agendaForm, id: agendaId };

      // Local update first
      if (editingAgendaIndex !== null) {
        setAgenda(prev => prev.map((a, i) => i === editingAgendaIndex ? agendaDoc : a));
        setStatusMessage('Agenda updated.');
      } else {
        setAgenda(prev => ([...prev, agendaDoc]));
        setStatusMessage('Agenda created.');
      }

      // Persist to Firestore when available
      try {
        if (db && userId && appId) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agenda', agendaId), agendaDoc);
        } else if (!appId) {
          console.warn('appId not set, skipping agenda persist');
        }
      } catch (err) {
        console.error('Failed to persist agenda to Firestore', err);
        setStatusMessage('Saved locally but failed to persist agenda to database.');
      }

      setAgendaFormOpen(false);
      setEditingAgendaIndex(null);
    };
 
    const handleEditAgenda = (index) => {
      setEditingAgendaIndex(index);
      setAgendaForm(agenda[index]);
      setAgendaFormOpen(true);
    };
 
    const handleDeleteAgenda = async (index) => {
      if (!window.confirm('Delete this agenda?')) return;
      const toDelete = agenda[index];
      // Optimistic UI
      setAgenda(prev => prev.filter((_, i) => i !== index));
      setStatusMessage('Agenda removed.');
      try {
        if (db && userId && appId && toDelete?.id) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agenda', toDelete.id));
          setStatusMessage('Agenda removed successfully.');
        }
      } catch (err) {
        console.error('Failed to delete agenda in Firestore', err);
        setStatusMessage('Local delete succeeded but failed to remove agenda from database.');
      }
    };
 
    const MessageToast = ({ message, onClose }) => {
      if (!message) return null;
      return (
        <div className="fixed top-5 right-5 z-50 animate-fade-in-down bg-[#FFD700] text-[#0A1F44] font-semibold py-3 px-6 rounded-full shadow-lg transition-transform duration-300">
          <div className="flex items-center space-x-2">
            <span>{message}</span>
            <button onClick={onClose} className="text-[#0A1F44] ml-2">
              <XIcon size={18} />
            </button>
          </div>
        </div>
      );
    };

    if (!isLoggedIn) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-[#111827]">
          <MessageToast message={statusMessage} onClose={() => setStatusMessage('')} />
          <div className="bg-[#0A1F44] p-8 rounded-2xl shadow-xl w-full max-w-md border border-[#2979FF] animate-fade-in">
            <h2 className="text-3xl font-bold tracking-wide uppercase text-center text-white mb-6">
              Admin Login
            </h2>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B]"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B]"
                  placeholder="password"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#FFD700] text-[#0A1F44] font-bold rounded-full hover:bg-white transition-colors duration-300 shadow-lg animate-pulse-slow"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-4 sm:p-8">
        <MessageToast message={statusMessage} onClose={() => setStatusMessage('')} />
        <div className="w-full max-w-7xl mx-auto space-y-8">
          {/* Bill Management Panel */}
          <div className="bg-[#0A1F44] p-8 rounded-[2rem] shadow-xl border border-[#2979FF]/30 backdrop-blur-md animate-fade-in-up">
            <h2 className="text-3xl font-bold tracking-wide uppercase text-[#FFD700] text-center mb-6">
              {isEditingBill ? 'Edit Bill' : 'Add New Bill'}
            </h2>
            <form onSubmit={handleSubmitBill} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={billForm.title}
                  onChange={handleBillChange}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="id">
                  Bill ID
                </label>
                <input
                  id="id"
                  type="text"
                  name="id"
                  value={billForm.id}
                  onChange={handleBillChange}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="status">
                  Status
                </label>
                               <select
                  id="status"
                  name="status"
                  value={billForm.status}
                  onChange={handleBillChange}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner"
                  required
                >
                  <option value="">Select Status</option>
                  <option value="submitted">submitted</option>
                  <option value="scheduled">scheduled</option>
                  <option value="in debate">in debate</option>
                  <option value="amended">amended</option>
                  <option value="passed">passed</option>
                  <option value="failed">failed</option>
                  <option value="postponed">postponed</option>
                  <option value="sent to president">sent to president</option>
                  <option value="withdrawn">withdrawn</option>
                  <option value="first hearing">first hearing</option>
                  <option value="second hearing">second hearing</option>
                  <option value="third hearing">third hearing</option>
                  <option value="enacted">enacted</option>
                  <option value="vetoed">vetoed</option>
                  <option value="override won">override won</option>
                  <option value="override lost">override lost</option>
                  <option value="refiled">refiled</option>
                </select>
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="type">
                  Bill Type
                </label>
                <input
                  id="type"
                  type="text"
                  name="type"
                  value={billForm.type}
                  onChange={handleBillChange}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="date">
                  Date Introduced
                </label>
                <input
                  id="date"
                  type="text"
                  name="date"
                  value={billForm.date}
                  onChange={handleBillChange}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="sponsor">
                  Sponsor
                </label>
                <input
                  id="sponsor"
                  type="text"
                  name="sponsor"
                  value={billForm.sponsor}
                  onChange={handleBillChange}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="latestAction">
                  Latest Action
                </label>
                <input
                  id="latestAction"
                  type="text"
                  name="latestAction"
                  value={billForm.latestAction}
                  onChange={handleBillChange}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner placeholder-[#64748B]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="documentLink">
                  Document Link
                </label>
                <input
                  id="documentLink"
                  type="url"
                  name="documentLink"
                  value={billForm.documentLink}
                  onChange={handleBillChange}
                  className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] transition-all duration-300 shadow-inner"
                  placeholder="https://example.com/document.pdf"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="vote">
                  Vote Breakdown
                </label>

                {/* <-- REPLACE multi-selects with clickable pill lists that support multiple selections and enforce mutual exclusivity --> */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* AYES */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-xs text-[#94A3B8] font-semibold">Ayes</span>
                      <button
                        type="button"
                        className="text-xs text-[#CBD5E1] underline"
                        onClick={() => {
                          // no-op toggle; kept for UX if you want to add expand/collapse later
                        }}
                      >
                        ({(billForm.vote?.ayes || []).length})
                      </button>
                    </div>
                    <div className="max-h-40 overflow-auto p-2 bg-[#0A1F44] rounded">
                      {(representatives || []).map(rep => (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => toggleVoteMember(rep.name, 'ayes')}
                          className={`w-full text-left mb-2 px-2 py-1 rounded flex items-center justify-between text-sm transition-colors ${
                            isInVote(rep.name, 'ayes') ? 'bg-green-600 text-white' : 'bg-[#111827] text-[#CBD5E1] hover:bg-[#17233a]'
                          }`}
                        >
                          <span>{rep.name}</span>
                          <span className="text-xs opacity-80">{rep.party}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* NAYS */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-xs text-[#94A3B8] font-semibold">Nays</span>
                      <button
                        type="button"
                        className="text-xs text-[#CBD5E1] underline"
                        onClick={() => {}}
                      >
                        ({(billForm.vote?.nays || []).length})
                      </button>
                    </div>
                    <div className="max-h-40 overflow-auto p-2 bg-[#0A1F44] rounded">
                      {(representatives || []).map(rep => (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => toggleVoteMember(rep.name, 'nays')}
                          className={`w-full text-left mb-2 px-2 py-1 rounded flex items-center justify-between text-sm transition-colors ${
                            isInVote(rep.name, 'nays') ? 'bg-red-600 text-white' : 'bg-[#111827] text-[#CBD5E1] hover:bg-[#17233a]'
                          }`}
                        >
                          <span>{rep.name}</span>
                          <span className="text-xs opacity-80">{rep.party}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ABSTAIN */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-xs text-[#94A3B8] font-semibold">Abstain</span>
                      <button
                        type="button"
                        className="text-xs text-[#CBD5E1] underline"
                        onClick={() => {}}
                      >
                        ({(billForm.vote?.abstain || []).length})
                      </button>
                    </div>
                    <div className="max-h-40 overflow-auto p-2 bg-[#0A1F44] rounded">
                      {(representatives || []).map(rep => (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => toggleVoteMember(rep.name, 'abstain')}
                          className={`w-full text-left mb-2 px-2 py-1 rounded flex items-center justify-between text-sm transition-colors ${
                            isInVote(rep.name, 'abstain') ? 'bg-yellow-500 text-black' : 'bg-[#111827] text-[#CBD5E1] hover:bg-[#17233a]'
                          }`}
                        >
                          <span>{rep.name}</span>
                          <span className="text-xs opacity-80">{rep.party}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Absent auto-calculated */}
                <div className="mt-2 text-xs text-[#94A3B8]">
                  Absent: {
                    (representatives || [])
                      .map(rep => rep.name)
                      .filter(name =>
                        !(billForm.vote?.ayes || []).includes(name) &&
                        !(billForm.vote?.nays || []).includes(name) &&
                        !(billForm.vote?.abstain || []).includes(name)
                      )
                      .join(', ')
                  }
                </div>
              </div>
              {/* <-- end replacement --> */}
              <div className="md:col-span-2 text-center">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#FFD700] text-[#0A1F44] font-bold rounded-full hover:bg-white transition-colors duration-300 shadow-lg animate-pulse-slow"
                >
                  {isEditingBill ? 'Update Bill' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>

          {/* Bill Management */}
          <div className="bg-[#0A1F44] p-8 rounded-[2rem] shadow-xl border border-[#2979FF]/30 backdrop-blur-md animate-fade-in-up">
            <h2 className="text-3xl font-bold tracking-wide uppercase text-[#FFD700] text-center mb-6">
              Bill Management
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-white table-auto">
                <thead>
                  <tr className="bg-[#111827] text-left uppercase text-sm tracking-wide">
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Document</th>
                    <th className="px-4 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr
                      key={bill.id}
                      className="border-b border-white/10 hover:bg-[#111827]/50 transition-colors duration-200"
                    >
                                            <td className="px-4 py-4 font-mono text-[#CBD5E1] text-xs align-top">{bill.id}</td>
                      <td className="px-4 py-4 text-white text-sm align-top">{bill.title}</td>
                      <td className="px-4 py-4 align-top">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${getAdminStatusColor(bill.status)}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {bill.documentLink ? (
                          <a
                            href={bill.documentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 bg-[#FFD700] text-[#0A1F44] font-semibold rounded-lg hover:bg-white transition-colors duration-200 shadow-lg min-w-[80px] text-center inline-block"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-[#64748B] text-sm">No link</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEditBill(bill)}
                           
                            className="text-[#2979FF] hover:text-white transition-colors duration-200"
                            aria-label={`Edit ${bill.title}`}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteBill(bill.id)}
                            className="text-[#FFD700] hover:text-white transition-colors duration-200"
                            aria-label={`Delete ${bill.title}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Representative Management Panel */}
          <div className="bg-[#0A1F44] p-8 rounded-[2rem] shadow-xl border border-[#2979FF]/30 backdrop-blur-md animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold tracking-wide uppercase text-[#FFD700] mb-2">
                Manage Representatives
              </h2>
              <p className="text-[#94A3B8] text-sm">
                Total Representatives: {representatives.length}
              </p>
            </div>
            <form onSubmit={handleSubmitRep} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="rep-name">Name</label>
                  <input id="rep-name" type="text" name="name" value={repForm.name} onChange={handleRepChange} className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] shadow-inner" required />
                </div>
                <div>
                  <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="rep-party">Party</label>
                  <select id="rep-party" name="party" value={repForm.party} onChange={handleRepChange} className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] shadow-inner" required>
                    <option value="">Select Party</option>
                    <option value="United Russia">United Russia</option>
                    <option value="Russia of the Future">Russia of the Future</option>
                    <option value="Independent">Independent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="rep-image">Image URL</label>
                  <input id="rep-image" type="text" name="image" value={repForm.image} onChange={handleRepChange} className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] shadow-inner" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="rep-lead">Leadership Role</label>
                  <select id="rep-lead" name="leadershipRole" value={repForm.leadershipRole} onChange={handleRepChange} className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] shadow-inner">
                    <option value="">None</option>
                    <option value="speaker">Duma Speaker</option>
                    <option value="majorityLeader">Majority Leader</option>
                    <option value="minorityLeader">Minority Leader</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[#94A3B8] text-sm mb-2" htmlFor="rep-region">Region</label>
                  <select id="rep-region" name="region" value={repForm.region} onChange={handleRepChange} className="w-full px-4 py-3 bg-[#111827] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2979FF] shadow-inner" required>
                    <option value="">Select Region</option>
                    <option value="Volga Valley">Volga Valley</option>
                    <option value="Northern Frontier">Northern Frontier</option>
                    <option value="Caucasia">Caucasia</option>
                    <option value="Central Steppes">Central Steppes</option>
                    <option value="Siberian Frontier">Siberian Frontier</option>
                    <option value="Outer Mongolia">Outer Mongolia</option>
                  </select>
                </div>
                <div className="md:col-span-2 text-center space-x-4">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-[#FFD700] text-[#0A1F44] font-bold rounded-full hover:bg-white transition-colors duration-300 shadow-lg"
                    disabled={!db || !userId || !appId}
                    style={!db || !userId || !appId ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    {(!db || !userId || !appId)
                      ? 'Waiting for database...'
                      : (isEditingRep ? 'Update Representative' : 'Add Representative')}
                  </button>
                  {isEditingRep && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingRep(false);
                        setRepForm({ id: '', name: '', party: '', region: '', image: '', leadershipRole: '' });
                      }}
                      className="px-6 py-3 bg-[#64748B] text-white font-bold rounded-full hover:bg-[#94A3B8] transition-colors duration-300 shadow-lg"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
            </form>
            
            {/* Admin Rep Search/Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 mt-8"> {/* added mt-8 so search/filter sits below the Add Representative button */}

              <input
                type="text"
                placeholder="Search representatives by name..."
                value={repSearchTerm}
                onChange={e => setRepSearchTerm(e.target.value)}
                className="w-full sm:w-1/2 px-4 py-2 rounded bg-[#111827] text-white"
              />
              <select
                value={repPartyFilter}
                onChange={e => setRepPartyFilter(e.target.value)}
                className="w-full sm:w-1/2 px-4 py-2 rounded bg-[#111827] text-white"
              >
                <option value="All">All Parties</option>
                <option value="United Russia">United Russia</option>
                <option value="Russia of the Future">Russia of the Future</option>
                <option value="Independent">Independent</option>
              </select>
            </div>

            {/* Representatives List */}
            <div className="mt-8 bg-[#111827] p-6 rounded-xl border border-[#2979FF]/20">
              <h3 className="text-xl font-bold tracking-wide uppercase text-[#FFD700] mb-4">All Representatives</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-white table-auto">
                  <thead>
                    <tr className="bg-[#0A1F44] text-left uppercase text-sm tracking-wide">
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Party</th>
                      <th className="px-4 py-3 font-semibold">Region</th>
                      <th className="px-4 py-3 font-semibold">Leadership Role</th>
                      <th className="px-4 py-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReps.length > 0 ? (
                      filteredReps.map((rep) => (
                        <tr
                          key={rep.id}
                          className="border-b border-white/10 hover:bg-[#0A1F44]/50 transition-colors duration-200"
                        >
                          <td className="px-4 py-4 text-white text-sm align-top">{rep.name}</td>
                          <td className="px-4 py-4 align-top">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${rep.party === 'United Russia' ? 'bg-red-500 text-white' : rep.party === 'Russia of the Future' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                              {rep.party}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-[#CBD5E1] text-sm align-top">{rep.region}</td>
                          <td className="px-4 py-4 text-[#CBD5E1] text-sm align-top">
                            {rep.leadershipRole ? (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[#FFD700] text-[#0A1F44]">
                                {rep.leadershipRole === 'speaker' ? 'Duma Speaker' : 
                                 rep.leadershipRole === 'majorityLeader' ? 'Majority Leader' : 
                                 rep.leadershipRole === 'minorityLeader' ? 'Minority Leader' : rep.leadershipRole}
                              </span>
                            ) : (
                              <span className="text-[#64748B] text-xs">None</span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleEditRep(rep)}
                                className="text-[#2979FF] hover:text-white transition-colors duration-200"
                                aria-label={`Edit ${rep.name}`}
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteRep(rep.id)}
                                className="text-[#FFD700] hover:text-white transition-colors duration-200"
                                aria-label={`Delete ${rep.name}`}
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-[#94A3B8]">
                          No representatives found. Add some using the form above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Agenda management panel */}
            <div className="mt-8 bg-[#0A1F44] p-6 rounded-xl border border-[#2979FF]/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold tracking-wide uppercase text-[#FFD700] mb-2">
                  Manage Duma Agenda
                </h3>
                <div className="flex space-x-2">
                  <button onClick={openNewAgendaForm} className="px-3 py-2 bg-[#2979FF] rounded-full text-white">New Agenda</button>
                </div>
              </div>
              <div className="space-y-3">
                {agenda.length ? agenda.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#0A1F44] p-3 rounded">
                    <div>
                      <div className="font-mono text-sm text-[#CBD5E1]">{a.date}</div>
                      <div className="text-sm text-white">{a.business?.length || 0} business items</div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditAgenda(idx)} className="px-2 py-1 bg-[#FFD700] rounded">Edit</button>
                      <button onClick={() => handleDeleteAgenda(idx)} className="px-2 py-1 bg-red-500 rounded text-white">Delete</button>
                    </div>
                  </div>
                )) : <div className="text-sm text-[#94A3B8]">No agendas defined</div>}
              </div>
 
              {/* Agenda form modal-ish area */}
              {agendaFormOpen && (
                <form onSubmit={handleSaveAgenda} className="mt-4 bg-[#111827] p-4 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-[#94A3B8]">Date</label>
                      <input className="w-full px-3 py-2 bg-[#0A1F44] rounded" value={agendaForm.date} onChange={(e) => setAgendaForm(prev => ({ ...prev, date: e.target.value }))} placeholder="YYYY-MM-DD" required />
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={addAgendaItemField} className="px-3 py-2 bg-[#2979FF] rounded text-white">Add Business Item</button>
                    </div>
                  </div>
                                      <div className="mt-3 space-y-3">
                      {agendaForm.business.map((item, i) => (
                        <div key={i} className="bg-[#0A1F44] p-3 rounded space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                            <input placeholder="Time" value={item.time} onChange={(e) => handleAgendaItemChange(i, 'time', e.target.value)} className="px-2 py-1 bg-[#111827] rounded col-span-1" />
                            <input placeholder="Title" value={item.title} onChange={(e) => handleAgendaItemChange(i, 'title', e.target.value)} className="px-2 py-1 bg-[#111827] rounded col-span-2" />
                            <div className="flex items-center space-x-2">
                              <button type="button" onClick={() => removeAgendaItemField(i)} className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                                Remove
                              </button>
                            </div>
                          </div>
                          
                          {/* Rich Text Editor for Details */}
                          <div className="space-y-2">
                            <label className="text-sm text-[#94A3B8]">Details (with formatting)</label>
                            <div className="bg-[#111827] p-2 rounded border border-[#2979FF]/20">
                              {/* Text Formatting Controls */}
                              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-[#0A1F44] rounded">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-${i}`);
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selected = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + `<b>${selected}</b>` + after;
                                    handleAgendaItemChange(i, 'text', newText);
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 3, start + 3 + selected.length);
                                    }, 0);
                                  }}
                                  className="px-2 py-1 bg-[#2979FF] text-white text-xs rounded hover:bg-[#FFD700] hover:text-[#0A1F44]"
                                >
                                  Bold
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textarea = document.getElementById(`text-${i}`);
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selected = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + `<i>${selected}</i>` + after;
                                    handleAgendaItemChange(i, 'text', newText);
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 3, start + 3 + selected.length);
                                    }, 0);
                                  }}
                                  className="px-2 py-1 bg-[#2979FF] text-white text-xs rounded hover:bg-[#FFD700] hover:text-[#0A1F44]"
                                >
                                  Italic
                                </button>
                                <select
                                  onChange={(e) => {
                                    const textarea = document.getElementById(`text-${i}`);
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selected = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + `<span style="color: ${e.target.value}">${selected}</span>` + after;
                                    handleAgendaItemChange(i, 'text', newText);
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 25, start + 25 + selected.length);
                                    }, 0);
                                  }}
                                  className="px-2 py-1 bg-[#2979FF] text-white text-xs rounded hover:bg-[#FFD700] hover:text-[#0A1F44]"
                                >
                                  <option value="">Color</option>
                                  <option value="#FFD700">Gold</option>
                                  <option value="#2979FF">Blue</option>
                                  <option value="#22C55E">Green</option>
                                  <option value="#EF4444">Red</option>
                                  <option value="#F59E0B">Orange</option>
                                  <option value="#8B5CF6">Purple</option>
                                  <option value="#06B6D4">Cyan</option>
                                  <option value="#F97316">Amber</option>
                                  <option value="#EC4899">Pink</option>
                                </select>
                                <select
                                  onChange={(e) => {
                                    const textarea = document.getElementById(`text-${i}`);
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selected = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + `<span style="font-size: ${e.target.value}">${selected}</span>` + after;
                                    handleAgendaItemChange(i, 'text', newText);
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 30, start + 30 + selected.length);
                                    }, 0);
                                  }}
                                  className="px-2 py-1 bg-[#2979FF] text-white text-xs rounded hover:bg-[#FFD700] hover:text-[#0A1F44]"
                                >
                                  <option value="">Size</option>
                                  <option value="0.75rem">Small</option>
                                  <option value="1rem">Normal</option>
                                  <option value="1.25rem">Large</option>
                                  <option value="1.5rem">Extra Large</option>
                                </select>
                              </div>
                              <textarea
                                id={`text-${i}`}
                                placeholder="Details (supports HTML formatting)"
                                value={item.text}
                                onChange={(e) => handleAgendaItemChange(i, 'text', e.target.value)}
                                className="w-full px-2 py-1 bg-[#111827] rounded text-white text-sm"
                                rows="3"
                              />
                              <div className="text-xs text-[#64748B] mt-1">
                                Use formatting buttons above or type HTML tags manually
                              </div>
                            </div>
                          </div>
                          
                          {/* Bill Items Section */}
                          <div className="space-y-2">
                            <label className="text-sm text-[#94A3B8]">Bill Items (optional)</label>
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...(item.items || []), { name: '', details: '' }];
                                handleAgendaItemChange(i, 'items', newItems);
                              }}
                              className="px-2 py-1 bg-[#22C55E] text-white text-xs rounded hover:bg-[#16A34A]"
                            >
                              Add Bill
                            </button>
                            {item.items && item.items.map((bill, billIndex) => (
                              <div key={billIndex} className="bg-[#111827] p-2 rounded space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-[#94A3B8] mb-1">Bill {billIndex + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = item.items.filter((_, idx) => idx !== billIndex);
                                      handleAgendaItemChange(i, 'items', newItems);
                                    }}
                                    className="px-1 py-0.5 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <input
                                  placeholder="Bill name"
                                  value={bill.name}
                                  onChange={(e) => {
                                    const newItems = [...item.items];
                                    newItems[billIndex] = { ...bill, name: e.target.value };
                                    handleAgendaItemChange(i, 'items', newItems);
                                  }}
                                  className="w-full px-2 py-1 bg-[#0A1F44] rounded text-white text-sm"
                                />
                                <input
                                  placeholder="Bill details"
                                  value={bill.details}
                                  onChange={(e) => {
                                    const newItems = [...item.items];
                                    newItems[billIndex] = { ...bill, details: e.target.value };
                                    handleAgendaItemChange(i, 'items', newItems);
                                  }}
                                  className="w-full px-2 py-1 bg-[#0A1F44] rounded text-white text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  <div className="mt-3 flex space-x-2">
                    <button className="px-4 py-2 bg-[#FFD700] rounded">Save Agenda</button>
                    <button type="button" onClick={() => { setAgendaFormOpen(false); setEditingAgendaIndex(null); }} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
    
    const renderPage = () => (
    currentPage === 'home' ? <Home /> :
    currentPage === 'leadership' ? <Leadership /> :
    currentPage === 'representatives' ? <Representatives /> :
    currentPage === 'legislative-activity' ? <LegislativeActivity /> :
    currentPage === 'admin' ? <AdminPage /> :
    <Home />
  );

  // Navigation component
  const Navbar = ({ currentPage, setCurrentPage }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navItems = [
      { id: 'home', label: 'Home', icon: HomeIcon },
      { id: 'leadership', label: 'Leadership', icon: Users },
      { id: 'representatives', label: 'Representatives', icon: User },
      { id: 'legislative-activity', label: 'Legislative Activity', icon: Gavel }
    ];

    return (
      <nav className="bg-[#0A1F44] shadow-xl border-b border-[#2979FF]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-[#FFD700]">State Duma</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                        currentPage === item.id
                          ? 'bg-[#2979FF] text-white'
                          : 'text-[#94A3B8] hover:text-white hover:bg-[#111827]'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage('admin')}
                  className="px-3 py-2 rounded-md text-sm font-medium text-[#FFD700] hover:text-white hover:bg-[#111827] transition-colors duration-200 flex items-center space-x-2"
                >
                  <Lock size={16} />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2979FF]"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <XIcon className="block h-6 w-6" />
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#0A1F44] border-t border-[#2979FF]/30">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${
                      currentPage === item.id
                        ? 'bg-[#2979FF] text-white'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#111827]'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setCurrentPage('admin');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-[#FFD700] hover:text-white hover:bg-[#111827] transition-colors duration-200 flex items-center space-x-3"
              >
                <Lock size={20} />
                <span>Admin</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    );
  };

  // Footer component
  const Footer = () => (
    <footer className="bg-[#0A1F44] text-[#94A3B8] py-6 sm:py-8 border-t border-[#2979FF]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm sm:text-base">&copy; 2025 State Duma of the Russian Federation. All rights reserved.</p>
      </div>
    </footer>
  );

  return (
    <div className="bg-[#111827] text-white min-h-screen font-[Inter] flex flex-col">
      <style>{`
        body {
          font-family: 'Inter', sans-serif;
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.8s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-fade-in-modal {
          animation: fadeInModal 0.3s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        input[type="range"] {
          -webkit-appearance: none;
          background: transparent;
          cursor: pointer;
          width: 100%;
        }

        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px;
          background: #0A1F44;
          border-radius: 4px;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #FFD700;
          cursor: pointer;
          margin-top: -6px;
          box-shadow: 0 0 5px rgba(255, 215, 0, 0.75);
          border: 2px solid #0A1F44;
        }
        
        input[type="range"]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 4px rgba(41, 121, 255, 0.5);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes fadeInModal {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="container mx-auto py-4 sm:py-8 px-2 sm:px-4 flex-grow">
        <div className="max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;