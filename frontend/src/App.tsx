import { epilot } from "@epilot/app-bridge";
import { useEffect, useMemo, useState } from "react";
import { useEntity } from "./hooks/useEntity";
import { FeedInTariffsTable, FeedInTariff } from "./components/FeedInTariffsTable";
import { FeedInTariffsTableSkeleton } from "./components/FeedInTariffsTableSkeleton";

export function App () {
  
  // TODO the context should be typed through our app bridge oss package
  const [ctx, setCtx] = useState<any>(null);

  console.log('***', { ctx })

  const entityQuery = useEntity({ id: ctx?.entityId, slug: ctx?.schema });

  const tariffs = useMemo(() => {
    return (entityQuery.data?.entity?.eeg_feed_in_tariffs || []) as FeedInTariff[];
  }, [entityQuery.data]);

  useEffect(() => {
    const unsubscribe = epilot.subscribeToParentMessages('init-context', (message) => {
      console.log('[epilot-feed-in-tariffs-app] Received init-context message:', message.data?.context);

      if(message.data.context) {
        console.log('[epilot-feed-in-tariffs-app] Setting context:', message.data.context);
        setCtx(message.data.context);
      }
    });

    epilot.sendMessageToParent('init-context', {});

    return () => {
      unsubscribe();
    }
  }, []);


  return (
    <div id="feed-in-tariffs-app" >
      {entityQuery.isError ? <p>Error: {entityQuery.error.message}</p> : null}

      {entityQuery.isLoading ? (
        <FeedInTariffsTableSkeleton />
      ) : (
        <FeedInTariffsTable tariffs={tariffs} schema={ctx?.schema} />
      )}
    </div>
  );
}
