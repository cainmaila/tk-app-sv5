<script lang="ts">
	import type { GroundingSource } from '$lib/types';

	interface Props {
		source: GroundingSource;
	}

	let { source }: Props = $props();
</script>

<a
	href={source.uri}
	target="_blank"
	rel="noopener noreferrer"
	title={source.title || source.uri}
	class="source-pill"
>
	{source.title || new URL(source.uri).hostname}
</a>
