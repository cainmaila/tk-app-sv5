<script lang="ts">
	interface Props {
		size?: 'small' | 'medium' | 'large';
	}

	let { size = 'medium' }: Props = $props();

	const sizeStyles = {
		small: 'width: 1.25rem; height: 1.25rem;',
		medium: 'width: 2rem; height: 2rem;',
		large: 'width: 3rem; height: 3rem;'
	};
</script>

<div class="loading-spinner" style="{sizeStyles[size]} color: #0ea5e9;" aria-label="載入中"></div>
