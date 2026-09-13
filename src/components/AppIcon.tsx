export default function AppIcon({name,size=24}:{name:string;size?:number}){
 const paths:Record<string,string>={play:'m9 5 11 7-11 7V5Z',history:'M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1m3 12 3-3 3 2 3-4',compare:'M4 19v-5m5 5V9m5 10V5m5 14v-8M3 4h6m-2-2 2 2-2 2',home:'m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9',mail:'M3 5h18v14H3V5Zm0 1 9 7 9-7',check:'m5 12 4 4L19 6'};
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.history}/></svg>;
}
